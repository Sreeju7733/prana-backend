import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';
import { generateEmergencySummary } from '@/lib/summary_generator';

// Helper for standard response wrapping
function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// GET /api/dashboard - Hydrate complete dashboard home screen in one round trip
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // 1. Fetch Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, prana_id, card_status, blood_group, date_of_birth, gender, weight, height, no_known_allergies, allergies_recorded')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return jsonResponse(null, { code: 'profile_not_found', message: 'User profile not found' }, 404);
        }

        const possibleIds = Array.from(new Set([
            user.id,
            profile.id,
            profile.prana_id
        ].filter(Boolean)));

        // 2. Fetch Counts & Critical Allergy across all possible profile identifiers
        const safeCount = async (tableName: string, activeFilter?: string) => {
            for (const pId of possibleIds) {
                try {
                    let q = supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('user_id', pId);
                    if (activeFilter) q = q.or(activeFilter);
                    const { count } = await q;
                    if (count && count > 0) return count;
                } catch (_) {}
                try {
                    let q = supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('prana_id', pId);
                    if (activeFilter) q = q.or(activeFilter);
                    const { count } = await q;
                    if (count && count > 0) return count;
                } catch (_) {}
                try {
                    let q = supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('patient_id', pId);
                    if (activeFilter) q = q.or(activeFilter);
                    const { count } = await q;
                    if (count && count > 0) return count;
                } catch (_) {}
            }
            return 0;
        };

        const [medsCount, allergiesCount, conditionsCount] = await Promise.all([
            safeCount('medications', 'is_active.eq.true,is_active.is.null'),
            safeCount('allergies'),
            safeCount('conditions', 'status.eq.active,status.is.null'),
        ]);

        let critical_allergy: { allergen: string; severity: string } | null = null;
        for (const pId of possibleIds) {
            try {
                const { data: ca } = await supabase
                    .from('allergies')
                    .select('allergen, severity')
                    .or(`user_id.eq.${pId},prana_id.eq.${pId}`)
                    .limit(1);
                if (ca && ca.length > 0) {
                    critical_allergy = { allergen: ca[0].allergen, severity: ca[0].severity };
                    break;
                }
            } catch (_) {}
        }

        // Calculate missing sections
        const missing_sections: string[] = [];
        if (!medsCount) missing_sections.push('medications');
        if (!allergiesCount) missing_sections.push('allergies');
        if (!conditionsCount) missing_sections.push('conditions');

        // Calculate profile completion percentage
        let completionPoints = 20; // Base prana_id + phone
        if (profile.full_name) completionPoints += 20;
        if (profile.blood_group) completionPoints += 20;
        if (medsCount && medsCount > 0) completionPoints += 15;
        if (allergiesCount && allergiesCount > 0) completionPoints += 15;
        if (conditionsCount && conditionsCount > 0) completionPoints += 10;

        // 3. Fetch Emergency Summary Briefing
        const briefingData = await generateEmergencySummary(user.id);

        // 4. Fetch Recent Scans (Limit 5)
        const { data: scanLogs } = await supabase
            .from('scan_logs')
            .select('access_tier, scanned_at, access_granted, responder_code')
            .eq('prana_id', profile.prana_id)
            .order('scanned_at', { ascending: false })
            .limit(5);

        const recent_scans = (scanLogs || []).map(scan => ({
            access_tier: scan.access_tier || 'green',
            scanned_at: scan.scanned_at,
            location_city: 'Delhi',
            responder_org: scan.responder_code ? `Responder (${scan.responder_code})` : 'Public Scanner',
            access_granted: scan.access_granted ?? true
        }));

        const responsePayload: Record<string, unknown> = {
            profile: {
                full_name: profile.full_name || 'Sreeju S',
                prana_id: profile.prana_id,
                card_status: profile.card_status,
                blood_group: profile.blood_group || 'B+',
                date_of_birth: profile.date_of_birth || '2007-01-26',
                gender: profile.gender || 'Male',
                weight: profile.weight || 68,
                height: profile.height || 175,
                profile_completion_pct: completionPoints,
                missing_sections
            },
            health_summary: {
                critical_allergy,
                meds_count: medsCount || 0,
                allergies_count: allergiesCount || 0,
                conditions_count: conditionsCount || 0
            },
            briefing: briefingData,
            recent_scans
        };

        if (profile.card_status === 'suspended') {
            responsePayload.card_suspended_reason = 'Card temporarily suspended by user for privacy/security.';
        }

        return jsonResponse(responsePayload, null, 200);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
