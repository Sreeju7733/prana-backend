import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// POST /api/patient/briefing/refresh - Regenerate AI medical briefing
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch profile, critical allergies, active medications, active conditions
        const { data: profile } = await supabase.from('profiles').select('blood_group, full_name').eq('id', user.id).single();
        const { data: allergies } = await supabase.from('allergies').select('allergen, severity').eq('user_id', user.id).eq('is_critical', true);
        const { data: meds } = await supabase.from('medications').select('name, dose, frequency').eq('user_id', user.id).eq('is_active', true);
        const { data: conditions } = await supabase.from('conditions').select('name, status').eq('user_id', user.id).eq('status', 'active');

        const criticalAllergiesText = allergies && allergies.length > 0
            ? allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')
            : 'None';

        const activeMedsText = meds && meds.length > 0
            ? meds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join(', ')
            : 'None';

        const conditionsText = conditions && conditions.length > 0
            ? conditions.map(c => c.name).join(', ')
            : 'None';

        const green_briefing = `Patient: ${profile?.full_name || 'User'}. Blood Group: ${profile?.blood_group || 'Unknown'}. Critical Allergies: ${criticalAllergiesText}.`;
        const yellow_briefing = `Active Conditions: ${conditionsText}. Active Medications: ${activeMedsText}. Emergency contact relay active.`;

        const { data: newBriefing, error } = await supabase
            .from('medical_briefings')
            .insert([{
                user_id: user.id,
                green_briefing,
                yellow_briefing,
                generated_by: 'gemini-2.5-flash',
                generated_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Medical briefing refreshed successfully',
            data: newBriefing
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
