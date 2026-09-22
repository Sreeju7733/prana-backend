import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// Helper to decode encrypted_phone column
function decodePhone(encryptedPhone: string | null): string {
    if (!encryptedPhone) return '';
    if (encryptedPhone.startsWith('ENC:')) {
        try {
            return Buffer.from(encryptedPhone.substring(4), 'base64').toString('utf-8');
        } catch (_) {
            // Ignore decode failure
        }
    }
    return encryptedPhone;
}

// GET /api/emergency-contacts - Fetch emergency contacts list
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('emergency_contacts')
            .select('id, name, relationship, encrypted_phone, is_primary, notification_channels, created_at')
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const formatted = (data || []).map((c: { encrypted_phone: string | null; [key: string]: unknown }) => ({
            ...c,
            phone: decodePhone(c.encrypted_phone),
            phone_number: decodePhone(c.encrypted_phone),
        }));

        return NextResponse.json({ success: true, data: formatted }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// POST /api/emergency-contacts - Add new emergency contact
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
        }

        if (!body.relationship || typeof body.relationship !== 'string' || body.relationship.trim() === '') {
            return NextResponse.json({ success: false, error: 'relationship is required' }, { status: 400 });
        }

        if (!body.phone || typeof body.phone !== 'string' || body.phone.trim() === '') {
            return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
        }

        const phoneClean = body.phone.trim();
        const crypto = await import('crypto');
        const phone_hash = crypto.createHash('sha256').update(phoneClean).digest('hex');

        // Simple base64 mock encryption for phone
        const encrypted_phone = `ENC:${Buffer.from(phoneClean).toString('base64')}`;

        let existingId = body.id;
        if (!existingId) {
            const { data: matched } = await supabase
                .from('emergency_contacts')
                .select('id')
                .eq('user_id', user.id)
                .eq('phone_hash', phone_hash)
                .limit(1);
            if (matched && matched.length > 0) {
                existingId = matched[0].id;
            }
        }

        let contactResult: { data: Record<string, unknown> | null; error: { message: string } | null };

        if (existingId) {
            const res = await supabase
                .from('emergency_contacts')
                .update({
                    name: body.name.trim(),
                    relationship: body.relationship.trim(),
                    phone_hash,
                    encrypted_phone,
                    is_primary: Boolean(body.is_primary)
                })
                .eq('id', existingId)
                .eq('user_id', user.id)
                .select('id, name, relationship, encrypted_phone, is_primary, notification_channels, created_at')
                .single();
            contactResult = { data: res.data as Record<string, unknown> | null, error: res.error };
        } else {
            const newContact = {
                user_id: user.id,
                name: body.name.trim(),
                relationship: body.relationship.trim(),
                phone_hash,
                encrypted_phone,
                is_primary: Boolean(body.is_primary),
                notification_channels: Array.isArray(body.notification_channels) ? body.notification_channels : ['push', 'sms']
            };

            const res = await supabase
                .from('emergency_contacts')
                .insert([newContact])
                .select('id, name, relationship, encrypted_phone, is_primary, notification_channels, created_at')
                .single();
            contactResult = { data: res.data as Record<string, unknown> | null, error: res.error };
        }

        if (contactResult.error) {
            return NextResponse.json({ success: false, error: contactResult.error.message }, { status: 500 });
        }

        const formattedData = {
            ...contactResult.data,
            phone: phoneClean,
            phone_number: phoneClean,
        };

        return NextResponse.json({
            success: true,
            message: 'Emergency contact processed successfully',
            data: formattedData
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
