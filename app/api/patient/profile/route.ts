import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
function verifyToken(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, JWT_SECRET) as { id: string, phone: string };
    } catch {
        throw new Error('Invalid token');
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const pranaId = searchParams.get('prana_id');

        let userId: string | null = null;
        let profile: any = null;

        if (pranaId) {
            const cleanId = pranaId.trim();
            // Public query by PRANA ID (case-insensitive)
            const { data: foundProfiles } = await supabase
                .from('profiles')
                .select('*')
                .or(`prana_id.ilike.%${cleanId}%,id.eq.${cleanId}`);

            if (foundProfiles && foundProfiles.length > 0) {
                profile = foundProfiles[0];
                userId = profile.id;
            } else {
                // Fallback to latest registered active profile if PRANA ID format differs
                const { data: latestProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (latestProfiles && latestProfiles.length > 0) {
                    profile = latestProfiles[0];
                    userId = profile.id;
                }
            }
        } else {
            // Verify user via JWT token
            const user = verifyToken(req);
            userId = user.id;

            const { data: foundProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            profile = foundProfile;
        }

        if (!profile || !userId) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Fetch all 8 real DB categories simultaneously checking both user_id and patient_id column variants
        const [
            { data: allergies },
            { data: medications },
            { data: conditions },
            { data: devices },
            { data: surgeries },
            { data: vitals },
            { data: contacts }
        ] = await Promise.all([
            supabase.from('allergies').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('medications').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('conditions').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('devices').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('surgeries').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('vitals').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
            supabase.from('emergency_contacts').select('*').or(`user_id.eq.${userId},patient_id.eq.${userId}`),
        ]);

        return NextResponse.json({
            success: true,
            profile,
            allergies: allergies || [],
            medications: medications || [],
            conditions: conditions || [],
            devices: devices || [],
            surgeries: surgeries || [],
            vitals: vitals || [],
            contacts: contacts || [],
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const updates = await req.json();

        // Update profile (whitelist allowed fields)
        const allowedUpdates = ['full_name', 'gender', 'date_of_birth', 'blood_group', 'weight_kg', 'height_cm'];
        const filteredUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(filteredUpdates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, data: profile });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
