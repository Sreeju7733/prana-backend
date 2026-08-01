import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/medications - List all active/inactive medications
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('medications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// POST /api/medications - Add a new medication record
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
        }

        const doseString = body.dose || (body.dose_value && body.dose_unit ? `${body.dose_value} ${body.dose_unit}` : body.dose_value || body.dose_unit || 'As prescribed');
        const frequencyString = body.frequency || 'Daily';

        const newRecord = {
            user_id: user.id,
            name: body.name.trim(),
            generic_name: body.generic_name || null,
            dose: doseString.trim(),
            dose_value: body.dose_value ? String(body.dose_value).trim() : null,
            dose_unit: body.dose_unit ? String(body.dose_unit).trim() : null,
            frequency: frequencyString.trim(),
            reason: body.reason ? String(body.reason).trim() : null,
            prescribed_by: body.prescribed_by || null,
            prescribed_date: body.prescribed_date || null,
            is_active: true,
            encrypted_prescription_url: body.encrypted_prescription_url || null
        };

        let { data, error } = await supabase
            .from('medications')
            .insert([newRecord])
            .select()
            .single();

        if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.code === '42703')) {
            // Fallback for older table schema without extra columns
            const fallbackRecord = {
                user_id: user.id,
                name: body.name.trim(),
                dose: doseString.trim(),
                frequency: frequencyString.trim(),
                is_active: true,
            };
            const fallbackResult = await supabase
                .from('medications')
                .insert([fallbackRecord])
                .select()
                .single();
            data = fallbackResult.data;
            error = fallbackResult.error;
        }

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Medication record added successfully',
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
