import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/patient/briefing - Returns AI-generated emergency briefing summary
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch briefing
        const { data: initialBriefing, error } = await supabase
            .from('medical_briefings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        let briefing = initialBriefing;

        // Generate fallback briefing if missing
        if (!briefing) {
            const { data: profile } = await supabase.from('profiles').select('blood_group, full_name').eq('id', user.id).single();
            const { data: allergies } = await supabase.from('allergies').select('allergen, severity').eq('user_id', user.id).eq('is_critical', true);
            const { data: meds } = await supabase.from('medications').select('name, dose').eq('user_id', user.id).eq('is_active', true);

            const criticalAllergiesText = allergies && allergies.length > 0
                ? allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')
                : 'No critical allergies reported';

            const activeMedsText = meds && meds.length > 0
                ? meds.map(m => `${m.name} ${m.dose}`).join(', ')
                : 'No active medications';

            const green_briefing = `Patient: ${profile?.full_name || 'User'}. Blood Group: ${profile?.blood_group || 'Unknown'}. Critical Allergies: ${criticalAllergiesText}.`;
            const yellow_briefing = `Active Medications: ${activeMedsText}. Emergency contact relay operational.`;

            const { data: newBriefing } = await supabase
                .from('medical_briefings')
                .insert([{
                    user_id: user.id,
                    green_briefing,
                    yellow_briefing,
                    generated_by: 'gemini-2.5-flash'
                }])
                .select()
                .single();

            briefing = newBriefing;
        }

        return NextResponse.json({ success: true, data: briefing }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
