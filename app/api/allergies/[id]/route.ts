import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];

// PATCH /api/allergies/:id - Update an existing allergy record (Owner only)
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        // Check ownership first
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

        // Validate patch fields
        if (body.allergen !== undefined) {
            if (typeof body.allergen !== 'string' || body.allergen.trim() === '') {
                return NextResponse.json({ success: false, error: 'allergen must be a non-empty string' }, { status: 400 });
            }
            if (body.allergen.length > 255) {
                return NextResponse.json({ success: false, error: 'allergen cannot exceed 255 characters' }, { status: 400 });
            }
        }

        if (body.severity !== undefined && body.severity !== null && !ALLOWED_SEVERITIES.includes(body.severity)) {
            return NextResponse.json({ success: false, error: `severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}` }, { status: 400 });
        }

        if (body.date_diagnosed) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(body.date_diagnosed) || isNaN(Date.parse(body.date_diagnosed))) {
                return NextResponse.json({ success: false, error: 'date_diagnosed must be a valid ISO date (YYYY-MM-DD)' }, { status: 400 });
            }

            const diagnosedDate = new Date(body.date_diagnosed);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (diagnosedDate > today) {
                return NextResponse.json({ success: false, error: 'date_diagnosed cannot be in the future' }, { status: 400 });
            }
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        const allowedFields = ['allergen', 'severity', 'reaction_description', 'date_diagnosed', 'is_critical'];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === 'allergen') {
                    updates.allergen = body.allergen.trim();
                } else {
                    updates[field] = body[field];
                }
            }
        }

        const { data, error } = await supabase
            .from('allergies')
            .update(updates)
            .eq('id', id)
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

// DELETE /api/allergies/:id - Remove an allergy record (Owner only)
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        // Check ownership first
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

        return NextResponse.json({
            success: true,
            message: 'Allergy record deleted successfully'
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
