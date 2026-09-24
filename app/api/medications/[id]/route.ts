import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// PATCH /api/medications/:id - Edit or mark medication inactive (supports client_uuid upsert)
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        // Try to find by server ID first, then by client_uuid
        let existing: any;
        let fetchError: any;

        const resById = await supabase
            .from('medications')
            .select('id, user_id, client_uuid')
            .eq('id', id)
            .single();

        if (resById.data) {
            existing = resById.data;
            fetchError = resById.error;
        } else if (body.client_uuid) {
            const resByClient = await supabase
                .from('medications')
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
            return NextResponse.json({ success: false, error: 'Medication record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        const allowedFields = ['name', 'generic_name', 'dose', 'dose_value', 'dose_unit', 'frequency', 'reason', 'prescribed_by', 'prescribed_date', 'is_active', 'encrypted_prescription_url', 'client_uuid'];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        // Use client_uuid for upsert if provided
        const whereClause = body.client_uuid
            ? { client_uuid: body.client_uuid, user_id: user.id }
            : { id };

        const { data, error } = await supabase
            .from('medications')
            .update(updates)
            .match(whereClause)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Medication record updated successfully',
            data
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// DELETE /api/medications/:id - Delete a medication entry
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        const { data: existing, error: fetchError } = await supabase
            .from('medications')
            .select('id, user_id, client_uuid')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Medication record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        const { error } = await supabase
            .from('medications')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Medication record deleted successfully'
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
