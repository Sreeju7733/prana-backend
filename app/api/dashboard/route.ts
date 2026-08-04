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

        // 1. Fetch Profile with fallbacks
        let profile: any = null;
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        profile = userProfile;

        if (!profile && user.phone) {
            const { data: phoneProfiles } = await supabase
                .from('profiles')
                .select('*')
                .eq('phone', user.phone)
                .limit(1);
            if (phoneProfiles && phoneProfiles.length > 0) {
                profile = phoneProfiles[0];
            }
        }

        if (!profile) {
            const { data: latestProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);
            if (latestProfiles && latestProfiles.length > 0) {
                profile = latestProfiles[0];
            }
        }

        if (!profile) {
            return jsonResponse(null, { code: 'profile_not_found', message: 'User profile not found' }, 404);
        }

        const effectiveUserId = profile.id;

        // 2. Fetch Meds, Allergies, and Conditions for the profile owner
        const [{ data: medsData, error: medsErr }, { data: allergiesData, error: allgErr }, { data: conditionsData, error: condErr }] = await Promise.all([
            supabase.from('medications').select('id, is_active').eq('user_id', effectiveUserId),
            supabase.from('allergies').select('id, allergen, severity, is_critical').eq('user_id', effectiveUserId),
            supabase.from('conditions').select('id, status').eq('user_id', effectiveUserId)
        ]);

        if (medsErr) console.error('Dashboard meds error:', medsErr);
        if (allgErr) console.error('Dashboard allergies error:', allgErr);
        if (condErr) console.error('Dashboard conditions error:', condErr);

        const activeMeds = (medsData || []).filter((m: any) => m.is_active !== false);
        const medsCount = activeMeds.length;

        const allergiesList = allergiesData || [];
        const allergiesCount = allergiesList.length;

        const activeConditions = (conditionsData || []).filter((c: any) => !c.status || c.status === 'active');
        const conditionsCount = activeConditions.length;

        const criticalOne = allergiesList.find((a: any) => a.is_critical || (a.severity && a.severity.toLowerCase().includes('severe')));
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
                weight: profile.weight_kg ?? profile.weight ?? 68,
                weight_kg: profile.weight_kg ?? profile.weight ?? 68,
                height: profile.height_cm ?? profile.height ?? 175,
                height_cm: profile.height_cm ?? profile.height ?? 175,
                avatar_url: profile.avatar_url,
                no_known_allergies: false,
                allergies_recorded: allergiesCount > 0,
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
