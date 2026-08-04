import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { verifyInMemoryOtp } from '@/lib/otpStore';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
    try {
        const { phone, otp } = await req.json();

        // Validate inputs
        if (!phone || !otp) {
            return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });
        }

        const cleanPhone = String(phone).trim();
        const cleanOtp = String(otp).trim();

        // 1. Check in-memory store
        const memResult = verifyInMemoryOtp(cleanPhone, cleanOtp);
        let isValidOtp = memResult.valid;

        if (!isValidOtp) {
            // 2. Fallback to Supabase database lookup
            const { data: otpRecords } = await supabase
                .from('otp_logs')
                .select('*')
                .eq('phone', cleanPhone)
                .eq('otp_code', cleanOtp)
                .order('created_at', { ascending: false });

            const otpRecord = otpRecords && otpRecords.length > 0 ? otpRecords[0] : null;
            if (otpRecord && !otpRecord.is_used) {
                const expiresAtMs = new Date(otpRecord.expires_at).getTime();
                if (isNaN(expiresAtMs) || expiresAtMs >= Date.now()) {
                    isValidOtp = true;
                    await supabase
                        .from('otp_logs')
                        .update({ is_used: true })
                        .eq('id', otpRecord.id);
                }
            }
        }

        if (!isValidOtp) {
            console.error('OTP verification failed for phone:', cleanPhone, 'otp:', cleanOtp, 'reason:', memResult.reason);
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
        }

        // Find or create user in profiles
        let isNewUser = false;
        const last10 = cleanPhone.replace(/\D/g, '').slice(-10);

        let { data: phoneProfiles } = await supabase
            .from('profiles')
            .select('*')
            .or(`phone.eq.${cleanPhone},phone.ilike.%${last10}%`)
            .limit(1);

        let profile = phoneProfiles && phoneProfiles.length > 0 ? phoneProfiles[0] : null;

        if (!profile) {
            // Check if there is an existing profile created during setup
            const { data: latestProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (latestProfiles && latestProfiles.length > 0 && latestProfiles[0].full_name && latestProfiles[0].full_name.trim() !== '') {
                profile = latestProfiles[0];
            }
        }

        if (!profile) {
            // User doesn't exist in profiles table -> create auth user first
            isNewUser = true;

            let e164Phone = cleanPhone;
            if (!e164Phone.startsWith('+')) {
              if (e164Phone.length === 10) {
                e164Phone = `+91${e164Phone}`;
              } else {
                e164Phone = `+${e164Phone}`;
              }
            }

            const { data: authUserData, error: authError } = await supabase.auth.admin.createUser({
                phone: e164Phone,
                phone_confirm: true,
            });

            let userId = authUserData?.user?.id;

            if (authError || !userId) {
                const { data: existingUsers } = await supabase.auth.admin.listUsers();
                const foundUser = existingUsers?.users?.find(u => u.phone === e164Phone || u.phone === cleanPhone);
                if (foundUser) {
                    userId = foundUser.id;
                } else {
                    throw authError || new Error('Failed to create auth user');
                }
            }

            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    phone: phone,
                    full_name: '',
                })
                .select()
                .single();

            if (createError) {
                throw createError;
            }
            profile = newProfile;
        } else if (profile && (!profile.full_name || profile.full_name.trim() === '' || profile.full_name === 'New User')) {
            isNewUser = true;
        } else {
            isNewUser = false;
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: profile.id, 
                phone: profile.phone,
                prana_id: profile.prana_id 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data + token + is_new_user flag
        return NextResponse.json({
            success: true,
            token,
            is_new_user: isNewUser,
            user: {
                id: profile.id,
                phone: profile.phone,
                full_name: profile.full_name,
                prana_id: profile.prana_id,
                blood_group: profile.blood_group,
                card_status: profile.card_status,
            }
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
