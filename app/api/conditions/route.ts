import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/conditions - List user's diagnosed conditions
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('conditions')
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

// POST /api/conditions - Add a new diagnosed condition
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
        }

        const ALLOWED_STATUS = ['active', 'resolved', 'chronic'];
        if (body.status && !ALLOWED_STATUS.includes(body.status)) {
            return NextResponse.json({ success: false, error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` }, { status: 400 });
        }

        const newRecord = {
            user_id: user.id,
            name: body.name.trim(),
            icd10_code: body.icd10_code || null,
            diagnosed_date: body.diagnosed_date || null,
            status: body.status || 'active',
            treating_doctor: body.treating_doctor || null,
            hospital: body.hospital || null,
            notes: body.notes || null
        };

        const { data, error } = await supabase
            .from('conditions')
            .insert([newRecord])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Condition record added successfully',
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
