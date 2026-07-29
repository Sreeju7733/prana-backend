import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client (service_role)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        // Validate phone
        if (!phone || phone.length < 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP in Supabase
        await supabase
            .from('otp_logs')
            .insert({
                phone: phone,
                otp_code: otp,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                user_agent: req.headers.get('user-agent'),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
            });

        // TODO: Send actual SMS via Fast2SMS
        console.log(`📱 OTP for ${phone}: ${otp}`);

        // FOR DEVELOPMENT: Return OTP (remove in production)
        return NextResponse.json({ 
            success: true, 
            message: 'OTP sent successfully',
            otp: otp // ❌ Remove this in production!
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
    }
}
