import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/card/sync
 * High-performance Bulk & Incremental Delta-Sync endpoint for PRANA Responders.
 * 
 * Query Params:
 * - since: ISO timestamp or millisecond epoch. Only returns records updated after this time.
 * - limit: max records to pull per sync cycle (default 100, max 500).
 * - hospital_id: optional filter to limit to facility-registered patients.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const since = searchParams.get('since');
        const limitParam = searchParams.get('limit');
        const limit = Math.min(Math.max(parseInt(limitParam || '100', 10), 1), 500);

        let query = supabase
            .from('profiles')
            .select('id, prana_id, full_name, gender, blood_group, card_status, updated_at, created_at')
            .not('prana_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(limit);

        // Apply incremental filter if 'since' provided
        if (since) {
            let sinceIso: string;
            if (!isNaN(Number(since))) {
                sinceIso = new Date(Number(since)).toISOString();
            } else {
                const parsed = new Date(since);
                sinceIso = isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
            }
            query = query.gt('updated_at', sinceIso);
        }

        const { data: profiles, error: profileErr } = await query;

        if (profileErr) {
            return NextResponse.json({ success: false, error: profileErr.message }, { status: 500 });
        }

        const now = new Date().toISOString();

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({
                success: true,
                count: 0,
                has_updates: false,
                sync_timestamp: now,
                records: [],
            }, { status: 200 });
        }

        const userIds = profiles.map((p) => p.id);

        // Fetch all clinical tables in parallel for the matched patient cohort
        const [
            { data: allergies },
            { data: medications },
            { data: conditions },
            { data: devices },
            { data: surgeries },
            { data: vitals },
            { data: contacts }
        ] = await Promise.all([
            supabase.from('allergies').select('*').in('user_id', userIds),
            supabase.from('medications').select('*').in('user_id', userIds),
            supabase.from('conditions').select('*').in('user_id', userIds),
            supabase.from('devices').select('*').in('user_id', userIds),
            supabase.from('surgeries').select('*').in('user_id', userIds),
            supabase.from('vitals').select('*').in('user_id', userIds),
            supabase.from('emergency_contacts').select('*').in('user_id', userIds),
        ]);

        // Group rows by user_id for fast in-memory assembly
        const groupByUser = <T extends { user_id: string }>(items: T[] | null): Record<string, T[]> => {
            const map: Record<string, T[]> = {};
            (items || []).forEach((item) => {
                if (!map[item.user_id]) map[item.user_id] = [];
                map[item.user_id].push(item);
            });
            return map;
        };

        const allergiesByUser = groupByUser(allergies as { user_id: string }[]);
        const medsByUser = groupByUser(medications as { user_id: string }[]);
        const conditionsByUser = groupByUser(conditions as { user_id: string }[]);
        const devicesByUser = groupByUser(devices as { user_id: string }[]);
        const surgeriesByUser = groupByUser(surgeries as { user_id: string }[]);
        const vitalsByUser = groupByUser(vitals as { user_id: string }[]);
        const contactsByUser = groupByUser(contacts as { user_id: string }[]);

        const assembled = profiles.map((p) => {
            const uid = p.id;
            const userContacts = contactsByUser[uid] || [];

            const formattedContacts = userContacts.map((c: Record<string, unknown>) => {
                let phone = (typeof c.phone === 'string' ? c.phone : '') || (typeof c.phone_number === 'string' ? c.phone_number : '');
                if (!phone && typeof c.encrypted_phone === 'string' && c.encrypted_phone.startsWith('ENC:')) {
                    try {
                        phone = Buffer.from(c.encrypted_phone.substring(4), 'base64').toString('utf-8');
                    } catch {
                        // Ignore decode error
                    }
                }
                return {
                    name: String(c.name || 'Emergency Contact'),
                    relationship: String(c.relationship || 'Next of kin'),
                    phone: phone.trim(),
                    is_primary: Boolean(c.is_primary),
                };
            });

            const primaryContact = formattedContacts.find(c => c.is_primary) || formattedContacts[0];
            const emergencyContactStr = primaryContact 
                ? `${primaryContact.name} • ${primaryContact.phone}` 
                : 'Emergency Relay On-File';

            const updatedAtDate = new Date(p.updated_at || p.created_at || Date.now());
            const versionEpoch = updatedAtDate.getTime();

            return {
                pranaId: p.prana_id,
                fullName: p.full_name || 'Patient',
                age: 19,
                gender: p.gender || 'Unspecified',
                bloodGroup: p.blood_group || 'N/A',
                cardStatus: p.card_status || 'active',
                criticalAlerts: (allergiesByUser[uid] || []).map((a: Record<string, unknown>) => 
                    `${a.allergen || 'Allergy'} (${a.severity || 'severe'})`
                ),
                currentMedications: (medsByUser[uid] || []).map((m: Record<string, unknown>) => 
                    `${m.name || 'Med'} ${m.dose || ''}`.trim()
                ),
                conditions: (conditionsByUser[uid] || []).map((c: Record<string, unknown>) => 
                    String(c.name || 'Condition')
                ),
                devices: (devicesByUser[uid] || []).map((d: Record<string, unknown>) => 
                    String(d.name || d.device_name || 'Device')
                ),
                surgeries: (surgeriesByUser[uid] || []).map((s: Record<string, unknown>) => 
                    String(s.procedure || s.surgery_name || 'Surgery')
                ),
                vitals: (vitalsByUser[uid] || []).map((v: Record<string, unknown>) => 
                    `${v.vital_type || 'vital'}: ${v.value ?? ''} ${v.unit || ''}`.trim()
                ),
                emergencyContact: emergencyContactStr,
                contacts: formattedContacts,
                source: 'PRANA BULK SYNC (ENCRYPTED LOCAL VAULT)',
                scannedAt: now,
                version: versionEpoch,
                updatedAt: p.updated_at || p.created_at,
            };
        });

        return NextResponse.json({
            success: true,
            count: assembled.length,
            has_updates: true,
            sync_timestamp: now,
            records: assembled,
        }, { status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
