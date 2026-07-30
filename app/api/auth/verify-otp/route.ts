import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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

        // Verify OTP from database
        const { data: otpRecord, error } = await supabase
            .from('otp_logs')
            .select('*')
            .eq('phone', phone)
            .eq('otp_code', otp)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !otpRecord) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
        }

        // Mark OTP as used
        await supabase
            .from('otp_logs')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        // Find or create user in profiles
        let isNewUser = false;
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', phone)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            // User doesn't exist in profiles table -> create auth user first
            isNewUser = true;

            // Create Supabase Auth user via admin API to get valid auth.users ID
            const { data: authUserData, error: authError } = await supabase.auth.admin.createUser({
                phone: phone,
                phone_confirm: true,
            });

            let userId = authUserData?.user?.id;

            if (authError || !userId) {
                // If user already exists in auth.users but not in profiles
                const { data: existingUsers } = await supabase.auth.admin.listUsers();
                const foundUser = existingUsers?.users?.find(u => u.phone === phone);
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
                    full_name: '', // Empty initially for new onboarding flow
                })
                .select()
                .single();

            if (createError) {
                throw createError;
            }
            profile = newProfile;
        } else if (profile && (!profile.full_name || profile.full_name === 'New User')) {
            // User profile exists but onboarding hasn't been completed yet
            isNewUser = true;
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
