import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

const ALLOWED_VITAL_TYPES = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'glucose', 'spo2', 'weight'];
const ALLOWED_SOURCES = ['manual', 'health_connect', 'wearable'];

// GET /api/vitals - List recorded vitals history
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('vitals')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
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

        if (!body.vital_type || !ALLOWED_VITAL_TYPES.includes(body.vital_type)) {
            return NextResponse.json({ success: false, error: `vital_type must be one of: ${ALLOWED_VITAL_TYPES.join(', ')}` }, { status: 400 });
        }

        if (body.value === undefined || typeof body.value !== 'number') {
            return NextResponse.json({ success: false, error: 'value is required and must be a number' }, { status: 400 });
        }

        if (!body.unit || typeof body.unit !== 'string') {
            return NextResponse.json({ success: false, error: 'unit is required (e.g. mmHg, bpm, kg, mg/dL)' }, { status: 400 });
        }

        if (body.source && !ALLOWED_SOURCES.includes(body.source)) {
            return NextResponse.json({ success: false, error: `source must be one of: ${ALLOWED_SOURCES.join(', ')}` }, { status: 400 });
        }

        const newRecord = {
            user_id: user.id,
            vital_type: body.vital_type,
            value: body.value,
            unit: body.unit.trim(),
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
