import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

const ALLOWED_VITAL_TYPES = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'glucose', 'spo2', 'weight'];
const ALLOWED_SOURCES = ['manual', 'health_connect', 'wearable'];

// GET /api/vitals - List recorded vitals history or latest per type
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const { searchParams } = new URL(req.url);
        const latestOnly = searchParams.get('latest') === 'true';

        const { data, error } = await supabase
            .from('vitals')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const items = data || [];
        if (latestOnly) {
            const latestMap = new Map();
            for (const item of items) {
                if (!latestMap.has(item.vital_type)) {
                    latestMap.set(item.vital_type, item);
                }
            }
            return NextResponse.json({ success: true, data: Array.from(latestMap.values()) }, { status: 200 });
        }

        return NextResponse.json({ success: true, data: items }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

function normalizeVitalType(type: string): string {
    const t = type.toLowerCase().trim().replace(/[\s-]/g, '_');
    if (t === 'blood_pressure' || t === 'bp') return 'bp_systolic';
    if (t === 'blood_glucose') return 'glucose';
    if (ALLOWED_VITAL_TYPES.includes(t)) return t;
    return 'heart_rate';
}

// POST /api/vitals - Log a new vital reading
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.vital_type || typeof body.vital_type !== 'string' || body.vital_type.trim() === '') {
            return NextResponse.json({ success: false, error: 'vital_type is required' }, { status: 400 });
        }

        if (body.value === undefined || body.value === null) {
            return NextResponse.json({ success: false, error: 'value is required' }, { status: 400 });
        }

        const rawType = body.vital_type.trim();

        // Special handling for Blood Pressure: create both Systolic and Diastolic entries
        if (rawType.toLowerCase().replaceAll(' ', '_') === 'blood_pressure' || rawType.toLowerCase() === 'bp') {
            const sysVal = typeof body.value === 'number' ? body.value : (parseFloat(String(body.value)) || 120);
            let diaVal = 80;
            if (body.unit && String(body.unit).includes('/')) {
                const parts = String(body.unit).split('/');
                if (parts.length > 1) {
                    diaVal = parseFloat(parts[1]) || 80;
                }
            }

            const sysRecord = {
                user_id: user.id,
                vital_type: 'bp_systolic',
                value: sysVal,
                unit: 'mmHg',
                source: body.source || 'manual',
                recorded_at: body.recorded_at || new Date().toISOString()
            };

            const diaRecord = {
                user_id: user.id,
                vital_type: 'bp_diastolic',
                value: diaVal,
                unit: 'mmHg',
                source: body.source || 'manual',
                recorded_at: body.recorded_at || new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('vitals')
                .insert([sysRecord, diaRecord])
                .select();

            if (error) {
                // Fallback for live Supabase schema without optional columns
                const { data: fbData, error: fbError } = await supabase
                    .from('vitals')
                    .insert([
                        { user_id: user.id, vital_type: 'bp_systolic', value: sysVal, unit: 'mmHg' },
                        { user_id: user.id, vital_type: 'bp_diastolic', value: diaVal, unit: 'mmHg' }
                    ])
                    .select();

                if (fbError) {
                    return NextResponse.json({ success: false, error: fbError.message }, { status: 500 });
                }
                return NextResponse.json({ success: true, message: 'Blood pressure logged successfully', data: fbData }, { status: 201 });
            }

            return NextResponse.json({ success: true, message: 'Blood pressure logged successfully', data }, { status: 201 });
        }

        // Single vital type normalization
        const validVitalType = normalizeVitalType(rawType);
        const numVal = typeof body.value === 'number' ? body.value : (parseFloat(String(body.value)) || 0);

        const newRecord: Record<string, any> = {
            user_id: user.id,
            vital_type: validVitalType,
            value: numVal,
            unit: body.unit ? String(body.unit).trim() : '',
            source: body.source || 'manual',
            recorded_at: body.recorded_at || new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('vitals')
            .insert([newRecord])
            .select()
            .single();

        if (error) {
            // Fallback for live Supabase schema without optional columns
            if (error.code === '42703' || error.message.includes('column') || error.message.includes('constraint')) {
                const fallbackRecord = {
                    user_id: user.id,
                    vital_type: validVitalType,
                    value: numVal,
                    unit: body.unit ? String(body.unit).trim() : ''
                };
                const { data: fbData, error: fbError } = await supabase
                    .from('vitals')
                    .insert([fallbackRecord])
                    .select()
                    .single();

                if (fbError) {
                    return NextResponse.json({ success: false, error: fbError.message }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Vital reading logged successfully',
                    data: fbData
                }, { status: 201 });
            }

            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Vital reading logged successfully',
            data
        }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
