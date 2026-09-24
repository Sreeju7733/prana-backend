import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// PATCH /api/conditions/:id - Edit condition (supports client_uuid upsert)
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        let existing: any;
        let fetchError: any;

        const resById = await supabase
            .from('conditions')
            .select('id, user_id, client_uuid')
            .eq('id', id)
            .single();

        if (resById.data) {
            existing = resById.data;
            fetchError = resById.error;
        } else if (body.client_uuid) {
            const resByClient = await supabase
                .from('conditions')
                .select('id, user_id, client_uuid')
                .eq('client_uuid', body.client_uuid)
                .eq('user_id', user.id)
                .single();
            existing = resByClient.data;
            fetchError = resByClient.error;
        } else {
            existing = null;
            fetchError = new Error('Not found');
        }

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Condition record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        const ALLOWED_STATUS = ['active', 'resolved', 'chronic'];
        if (body.status && !ALLOWED_STATUS.includes(body.status)) {
            return NextResponse.json({ success: false, error: `status must be one of: ${ALLOWED_STATUS.join(', ')}` }, { status: 400 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        const allowedFields = ['name', 'icd10_code', 'diagnosed_date', 'status', 'treating_doctor', 'hospital', 'notes', 'client_uuid'];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        const whereClause = body.client_uuid
            ? { client_uuid: body.client_uuid, user_id: user.id }
            : { id };

        const { data, error } = await supabase
            .from('conditions')
            .update(updates)
            .match(whereClause)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Condition record updated successfully',
            data
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// DELETE /api/conditions/:id
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        const { data: existing, error: fetchError } = await supabase
            .from('conditions')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Condition record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        const { error } = await supabase
            .from('conditions')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Condition record deleted successfully' }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
