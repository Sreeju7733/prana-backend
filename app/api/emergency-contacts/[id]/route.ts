import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto/field-encryption';

// PUT/PATCH /api/emergency-contacts/:id
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;
        const body = await req.json();

        const { data: existing, error: fetchError } = await supabase
            .from('emergency_contacts')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Emergency contact not found' }, { status: 404 });
        }
        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const updates: Record<string, unknown> = {};
        if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
        if (body.relationship && typeof body.relationship === 'string') updates.relationship = body.relationship.trim();
        
        if (body.phone && typeof body.phone === 'string') {
            const phoneClean = body.phone.trim();
            const crypto = await import('crypto');
            updates.phone_hash = crypto.createHash('sha256').update(phoneClean).digest('hex');
            updates.encrypted_phone = encrypt(phoneClean);
        }
        if (body.is_primary !== undefined) updates.is_primary = Boolean(body.is_primary);

        const { data, error } = await supabase
            .from('emergency_contacts')
            .update(updates)
            .eq('id', id)
            .select('id, name, relationship, encrypted_phone, is_primary, notification_channels, created_at')
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const phone = body.phone ? body.phone.trim() : (data.encrypted_phone ? decrypt(data.encrypted_phone) : '');
        return NextResponse.json({
            success: true,
            message: 'Emergency contact updated successfully',
            data: { ...data, phone, phone_number: phone }
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    return PUT(req, ctx);
}

// DELETE /api/emergency-contacts/:id
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = verifyToken(req);
        const { id } = await context.params;

        const { data: existing, error: fetchError } = await supabase
            .from('emergency_contacts')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (existing.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

        return NextResponse.json({ success: true, message: 'Deleted' }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
