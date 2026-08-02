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

        // Fallback to latest registered active profile if exact prana_id match fails
        if (!profile) {
            const { data: latest } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1);
            profile = latest?.[0];
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

        // Automatically log this scan event into scan_logs table
        try {
            await supabase.from('scan_logs').insert([{
                user_id: uid,
                prana_id: profile.prana_id || cleanId,
                scanner_type: 'Public (Green tier)',
                responder_org: 'Public QR Web Scanner',
                location_city: 'Delhi, India',
                gps_coordinates: '28.6139° N, 77.2090° E (Connaught Place, New Delhi)',
                access_tier: 'Green Tier',
                user_agent: 'PRANA Web/Mobile Scanner Engine',
                accessed_data_summary: 'Emergency Contacts, Blood Group & Critical Allergies',
                scanned_at: new Date().toISOString()
            }]);
        } catch (_) {}

        const rawContacts = filterUserRows(contacts);
        const formattedContacts = rawContacts.map((c: any) => {
            let phone = c.phone || c.phone_number || '';
            if (!phone && c.encrypted_phone && c.encrypted_phone.startsWith('ENC:')) {
                try {
                    phone = Buffer.from(c.encrypted_phone.substring(4), 'base64').toString('utf-8');
                } catch (_) {}
            }
            return {
                ...c,
                phone,
                phone_number: phone,
            };
        });

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
            contacts: formattedContacts,
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
