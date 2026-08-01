import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { storeOtp } from '@/lib/otpStore';

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

        const cleanPhone = phone.trim();

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Store in memory store
        storeOtp(cleanPhone, otp);

        // 2. Store in Supabase database
        const { error: dbError } = await supabase
            .from('otp_logs')
            .insert({
                phone: cleanPhone,
                otp_code: otp,
                is_used: false,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                user_agent: req.headers.get('user-agent'),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
            });

        if (dbError) {
            console.warn('DB OTP Insert Note:', dbError.message);
        }

        // TODO: Send actual SMS via Fast2SMS
        console.log(`📱 OTP for ${cleanPhone}: ${otp}`);

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

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
