import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        const { data: existing, error: fetchError } = await supabase
            .from('devices')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing || existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Device record not found or forbidden' }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const fields = ['device_name', 'model_manufacturer', 'implant_date', 'location_on_body', 'notes'];
        for (const f of fields) {
            if (body[f] !== undefined) updates[f] = body[f];
        }

        const { data, error } = await supabase.from('devices').update(updates).eq('id', id).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

        return NextResponse.json({ success: true, message: 'Device updated successfully', data }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        const { data: existing, error: fetchError } = await supabase
            .from('devices')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing || existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Device record not found or forbidden' }, { status: 404 });
        }

        const { error } = await supabase.from('devices').delete().eq('id', id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

        return NextResponse.json({ success: true, message: 'Device deleted successfully' }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
