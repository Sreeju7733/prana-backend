import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/emergency-contacts - Fetch emergency contacts list
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('emergency_contacts')
            .select('id, name, relationship, is_primary, notification_channels, created_at')
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] }, { status: 200 });

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

        // Simple mock encryption for phone if pgcrypto key not passed directly from client
        const encrypted_phone = `ENC:${Buffer.from(phoneClean).toString('base64')}`;

        const newContact = {
            user_id: user.id,
            name: body.name.trim(),
            relationship: body.relationship.trim(),
            phone_hash,
            encrypted_phone,
            is_primary: Boolean(body.is_primary),
            notification_channels: Array.isArray(body.notification_channels) ? body.notification_channels : ['push', 'sms']
        };

        const { data, error } = await supabase
            .from('emergency_contacts')
            .insert([newContact])
            .select('id, name, relationship, is_primary, notification_channels, created_at')
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Emergency contact added successfully',
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
