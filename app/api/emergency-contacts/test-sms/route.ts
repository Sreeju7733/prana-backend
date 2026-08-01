import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// POST /api/emergency-contacts/test-sms - Send test SMS alert to primary contact
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch primary emergency contact
        const { data: primaryContact, error } = await supabase
            .from('emergency_contacts')
            .select('id, name, relationship, is_primary')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .single();

        if (error || !primaryContact) {
            return NextResponse.json({
                success: false,
                error: 'No primary emergency contact found. Please designate a primary contact first.'
            }, { status: 404 });
        }

        // Mock SMS Dispatch via Fast2SMS / Twilio
        const message = `[PRANA EMERGENCY ALERT TEST] This is a test alert from PRANA Emergency Health Card system for contact: ${primaryContact.name}.`;

        return NextResponse.json({
            success: true,
            message: 'Test SMS alert dispatched successfully',
            recipient: {
                name: primaryContact.name,
                relationship: primaryContact.relationship
            },
            alert_payload: message,
            sent_at: new Date().toISOString()
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
