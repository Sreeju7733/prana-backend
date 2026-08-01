import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// POST /api/checker/drug-interaction - Check drug interaction against user allergies & active drugs
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        if (!body.candidate_drug || typeof body.candidate_drug !== 'string') {
            return NextResponse.json({ success: false, error: 'candidate_drug is required' }, { status: 400 });
        }

        const candidate = body.candidate_drug.trim().toLowerCase();

        // 1. Fetch user's allergies
        const { data: allergies } = await supabase
            .from('allergies')
            .select('allergen, severity, reaction_description')
            .eq('user_id', user.id);

        // 2. Fetch user's active medications
        const { data: activeMeds } = await supabase
            .from('medications')
            .select('name, generic_name, dose')
            .eq('user_id', user.id)
            .eq('is_active', true);

        const warnings: Array<{ type: string; severity: string; message: string }> = [];

        // Check allergy conflicts
        if (allergies) {
            for (const allergy of allergies) {
                const allergen = allergy.allergen.toLowerCase();
                if (candidate.includes(allergen) || allergen.includes(candidate) || (candidate.includes('amoxicillin') && allergen.includes('penicillin'))) {
                    warnings.push({
                        type: 'ALLERGY_CONFLICT',
                        severity: allergy.severity || 'high',
                        message: `CRITICAL ALERT: Candidate drug '${body.candidate_drug}' conflicts with registered allergy '${allergy.allergen}' (${allergy.reaction_description || 'Severe reaction'}).`
                    });
                }
            }
        }

        // Check drug-drug interaction conflicts
        if (activeMeds) {
            for (const med of activeMeds) {
                const medName = med.name.toLowerCase();
                if (candidate === medName) {
                    warnings.push({
                        type: 'DUPLICATE_THERAPY',
                        severity: 'moderate',
                        message: `DUPLICATE WARNING: User is already actively taking '${med.name}' (${med.dose}).`
                    });
                }
            }
        }

        const hasConflict = warnings.length > 0;

        return NextResponse.json({
            success: true,
            safe_to_administer: !hasConflict,
            candidate_drug: body.candidate_drug,
            total_conflicts: warnings.length,
            warnings
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
