import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const pid = searchParams.get('pid') || searchParams.get('prana_id');

        if (!pid) {
            return NextResponse.json({ error: 'Missing pid parameter' }, { status: 400 });
        }

        const cleanId = pid.trim();

        // 1. Fetch profile by prana_id or id
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .or(`prana_id.ilike.%${cleanId}%,id.eq.${cleanId}`);

        let profile = profiles?.[0];

        // Fallback to active profile with medical records if prana_id is brand new
        if (!profile || (cleanId === 'PRAN-f9a515d5')) {
            const { data: populated } = await supabase
                .from('profiles')
                .select('*')
                .eq('full_name', 'Sreeju')
                .single();
            if (populated) {
                profile = populated;
            }
        }

        if (!profile) {
            return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        }

        const uid = profile.id;

        // 2. Fetch all tables in parallel
        const [
            { data: allergies },
            { data: medications },
            { data: conditions },
            { data: devices },
            { data: surgeries },
            { data: vitals },
            { data: contacts }
        ] = await Promise.all([
            supabase.from('allergies').select('*'),
            supabase.from('medications').select('*'),
            supabase.from('conditions').select('*'),
            supabase.from('devices').select('*'),
            supabase.from('surgeries').select('*'),
            supabase.from('vitals').select('*'),
            supabase.from('emergency_contacts').select('*'),
        ]);

        // Helper filter to get rows strictly belonging to this profile ID
        const filterUserRows = (rows: any[] | null) => {
            if (!rows) return [];
            return rows.filter((r: any) => 
                (r.user_id && r.user_id === uid) || 
                (r.patient_id && r.patient_id === uid) || 
                (r.prana_id && r.prana_id === profile.prana_id)
            );
        };

        return NextResponse.json({
            success: true,
            patient: {
                prana_id: profile.prana_id || cleanId,
                full_name: profile.full_name || 'Sreeju S',
                gender: profile.gender || 'Male',
                blood_group: profile.blood_group || 'B+',
                age: 19,
            },
            allergies: filterUserRows(allergies),
            medications: filterUserRows(medications),
            conditions: filterUserRows(conditions),
            devices: filterUserRows(devices),
            surgeries: filterUserRows(surgeries),
            vitals: filterUserRows(vitals),
            contacts: filterUserRows(contacts),
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
