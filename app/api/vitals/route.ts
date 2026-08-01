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

// POST /api/vitals - Log a new vital reading
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.vital_type || typeof body.vital_type !== 'string' || body.vital_type.trim() === '') {
            return NextResponse.json({ success: false, error: 'vital_type is required' }, { status: 400 });
        }

        if (body.value === undefined) {
            return NextResponse.json({ success: false, error: 'value is required' }, { status: 400 });
        }

        const newRecord = {
            user_id: user.id,
            vital_type: body.vital_type.trim(),
            value: body.value,
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
