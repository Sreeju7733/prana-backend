import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import { storeOtp } from '@/lib/otpStore';

// Rate limiting state: phone -> timestamp
const resendLimitMap = new Map<string, number>();
const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds limit between resends

// POST /api/auth/resend-otp - Resend OTP with cooldown limit
export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
            return NextResponse.json({
                data: null,
                error: { code: 'invalid_phone', message: 'Invalid phone number (must be at least 10 digits)' }
            }, { status: 400 });
        }

        const phoneClean = phone.trim();
        const now = Date.now();
        const lastSent = resendLimitMap.get(phoneClean);

        // Check 60-second cooldown rate limit
        if (lastSent && (now - lastSent) < RESEND_COOLDOWN_SECONDS * 1000) {
            const remainingSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (now - lastSent)) / 1000);
            return NextResponse.json({
                data: null,
                error: {
                    code: 'rate_limited',
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
                    retry_after_seconds: remainingSeconds
                }
            }, { status: 429 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 1. Store in memory store
        storeOtp(phoneClean, otp);

        // 2. Store OTP in database
        const { error: dbError } = await supabase
            .from('otp_logs')
            .insert({
                phone: phoneClean,
                otp_code: otp,
                is_used: false,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                user_agent: req.headers.get('user-agent'),
                expires_at: expiresAt
            });

        if (dbError) {
            return NextResponse.json({
                data: null,
                error: { code: 'db_error', message: dbError.message }
            }, { status: 500 });
        }

        // Update rate limit timestamp
        resendLimitMap.set(phoneClean, now);

        console.log(`📱 [RESEND OTP] Sent to ${phoneClean}: ${otp}`);

        return NextResponse.json({
            data: {
                message: 'OTP resent successfully',
                phone: phoneClean,
                cooldown_seconds: RESEND_COOLDOWN_SECONDS,
                otp // Dev environment preview
            },
            error: null
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({
            data: null,
            error: { code: 'server_error', message }
        }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
