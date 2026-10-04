import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];

// PATCH /api/allergies/:id - Update allergy (supports client_uuid upsert)
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        // Find by server ID or client_uuid
        let existing: Record<string, unknown> | null = null;
        let fetchError: Error | { message: string } | null = null;

        const resById = await supabase
            .from('allergies')
            .select('id, user_id, client_uuid')
            .eq('id', id)
            .single();

        if (resById.data) {
            existing = resById.data;
            fetchError = resById.error;
        } else if (body.client_uuid) {
            const resByClient = await supabase
                .from('allergies')
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
            return NextResponse.json({ success: false, error: 'Allergy record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        if (body.severity !== undefined && body.severity !== null && !ALLOWED_SEVERITIES.includes(body.severity)) {
            return NextResponse.json({ success: false, error: `severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}` }, { status: 400 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        const allowedFields = ['allergen', 'severity', 'reaction_description', 'date_diagnosed', 'is_critical', 'client_uuid'];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = field === 'allergen' ? String(body[field]).trim() : body[field];
            }
        }

        const whereClause = body.client_uuid
            ? { client_uuid: body.client_uuid, user_id: user.id }
            : { id };

        const { data, error } = await supabase
            .from('allergies')
            .update(updates)
            .match(whereClause)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Allergy record updated successfully',
            data
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// DELETE /api/allergies/:id
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        const { data: existing, error: fetchError } = await supabase
            .from('allergies')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Allergy record not found' }, { status: 404 });
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this record' }, { status: 403 });
        }

        const { error } = await supabase
            .from('allergies')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Allergy record deleted successfully' }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
