import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// In-memory rate limiting map: userId -> timestamp
const rateLimitMap = new Map<string, number>();

// POST /api/briefing/regenerate - Trigger briefing refresh with rate limit & validation
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // 1. Rate Limit Check (1 regen per 5 min / 300 seconds)
        const lastRegen = rateLimitMap.get(user.id);
        const now = Date.now();
        if (lastRegen && (now - lastRegen) < 300 * 1000) {
            const retryAfter = Math.ceil((300 * 1000 - (now - lastRegen)) / 1000);
            return jsonResponse(null, {
                code: 'rate_limited',
                message: `Rate limit exceeded. Please wait ${retryAfter} seconds.`,
                retry_after_seconds: retryAfter
            }, 429);
        }

        // 2. Check health data existence
        const [{ count: medsCount }, { count: allergiesCount }, { count: conditionsCount }] = await Promise.all([
            supabase.from('medications').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('allergies').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('conditions').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        ]);

        const totalHealthRecords = (medsCount || 0) + (allergiesCount || 0) + (conditionsCount || 0);
        if (totalHealthRecords === 0) {
            return jsonResponse(null, {
                code: 'insufficient_data',
                message: 'Add at least one condition, allergy, or medication first'
            }, 422);
        }

        // 3. Fetch current health records
        const { data: profile } = await supabase.from('profiles').select('full_name, blood_group').eq('id', user.id).single();
        const { data: allergies } = await supabase.from('allergies').select('allergen, severity').eq('user_id', user.id);
        const { data: meds } = await supabase.from('medications').select('name, dose, frequency').eq('user_id', user.id).eq('is_active', true);
        const { data: conditions } = await supabase.from('conditions').select('name, status').eq('user_id', user.id).eq('status', 'active');

        const criticalAllergiesText = (allergies && allergies.length > 0)
            ? allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')
            : 'None';
        const activeMedsText = (meds && meds.length > 0)
            ? meds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join(', ')
            : 'None';
        const conditionsText = (conditions && conditions.length > 0)
            ? conditions.map(c => c.name).join(', ')
            : 'None';

        const greenText = `Patient: ${profile?.full_name || 'User'}. Blood Group: ${profile?.blood_group || 'Unknown'}. Allergies: ${criticalAllergiesText}.`;
        const yellowText = `Active Conditions: ${conditionsText}. Active Medications: ${activeMedsText}. Emergency contact relay active.`;

        const newBriefing = {
            user_id: user.id,
            green_briefing: greenText,
            yellow_briefing: yellowText,
            generated_by: 'gemini-2.5-flash',
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const { data: inserted, error: insertError } = await supabase
            .from('medical_briefings')
            .insert([newBriefing])
            .select()
            .single();

        if (insertError) {
            return jsonResponse(null, { code: 'llm_service_unavailable', message: insertError.message }, 503);
        }

        // Update rate limit timestamp
        rateLimitMap.set(user.id, now);

        return jsonResponse({
            text: inserted.green_briefing,
            bullets: [inserted.green_briefing, inserted.yellow_briefing].filter(Boolean),
            generated_at: inserted.generated_at,
            is_stale: false
        }, null, 200);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
