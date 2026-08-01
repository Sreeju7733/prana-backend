import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/surgeries - List surgeries
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('surgeries')
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

// POST /api/surgeries - Add surgery
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.procedure_name || typeof body.procedure_name !== 'string' || body.procedure_name.trim() === '') {
            return NextResponse.json({ success: false, error: 'procedure_name is required' }, { status: 400 });
        }

        const newRecord = {
            user_id: user.id,
            procedure_name: body.procedure_name.trim(),
            date_performed: body.date_performed || null,
            hospital: body.hospital || null,
            surgeon: body.surgeon || null,
            complications_notes: body.complications_notes || null
        };

        const { data, error } = await supabase
            .from('surgeries')
            .insert([newRecord])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Surgery recorded successfully', data }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
