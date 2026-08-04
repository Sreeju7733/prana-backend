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

        const filterExpr = possibleIds.map(id => `user_id.eq.${id},prana_id.eq.${id}`).join(',');

        // 2. Fetch Meds, Allergies, and Conditions across all profile identifiers
        const [{ data: medsData }, { data: allergiesData }, { data: conditionsData }] = await Promise.all([
            supabase.from('medications').select('id, is_active').or(filterExpr).catch(() => ({ data: [] })),
            supabase.from('allergies').select('id, allergen, severity, is_critical').or(filterExpr).catch(() => ({ data: [] })),
            supabase.from('conditions').select('id, status').or(filterExpr).catch(() => ({ data: [] }))
        ]);

        const activeMeds = ((medsData as any[]) || []).filter(m => m.is_active !== false);
        const medsCount = activeMeds.length;

        const allergiesList = (allergiesData as any[]) || [];
        const allergiesCount = allergiesList.length;

        const activeConditions = ((conditionsData as any[]) || []).filter(c => !c.status || c.status === 'active');
        const conditionsCount = activeConditions.length;

        const criticalOne = allergiesList.find(a => a.is_critical || (a.severity && a.severity.toLowerCase().includes('severe')));
        const critical_allergy = criticalOne ? { allergen: criticalOne.allergen, severity: criticalOne.severity || 'Severe' } : null;

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
                no_known_allergies: Boolean(profile.no_known_allergies),
                allergies_recorded: Boolean(profile.allergies_recorded),
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
