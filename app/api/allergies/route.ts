import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];

// GET /api/allergies - List all allergies for authenticated user
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data, error } = await supabase
            .from('allergies')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// POST /api/allergies - Create a new allergy record
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        // Validation
        if (!body.allergen || typeof body.allergen !== 'string' || body.allergen.trim() === '') {
            return NextResponse.json({ data: null, error: { code: 'validation_failed', message: 'allergen is required and must be a non-empty string' } }, { status: 400 });
        }

        if (body.allergen.length > 255) {
            return NextResponse.json({ data: null, error: { code: 'validation_failed', message: 'allergen cannot exceed 255 characters' } }, { status: 400 });
        }

        if (body.severity !== undefined && body.severity !== null && !ALLOWED_SEVERITIES.includes(body.severity)) {
            return NextResponse.json({ data: null, error: { code: 'validation_failed', message: `severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}` } }, { status: 400 });
        }

        const allergenClean = body.allergen.trim();

        // Duplicate Check (409 Conflict)
        const { data: existingAllergy } = await supabase
            .from('allergies')
            .select('id, allergen')
            .eq('user_id', user.id)
            .ilike('allergen', allergenClean)
            .maybeSingle();

        if (existingAllergy) {
            return NextResponse.json({
                data: null,
                error: {
                    code: 'duplicate_entry',
                    message: `Allergy '${allergenClean}' already exists. Please update the existing record instead of creating a duplicate.`,
                    existing_id: existingAllergy.id
                }
            }, { status: 409 });
        }

        if (body.date_diagnosed) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(body.date_diagnosed) || isNaN(Date.parse(body.date_diagnosed))) {
                return NextResponse.json({ data: null, error: { code: 'validation_failed', message: 'date_diagnosed must be a valid ISO date (YYYY-MM-DD)' } }, { status: 400 });
            }
        }

        const newRecord = {
            user_id: user.id,
            allergen: allergenClean,
            severity: body.severity || null,
            reaction_description: body.reaction_description || null,
            date_diagnosed: body.date_diagnosed || null,
            is_critical: Boolean(body.is_critical)
        };

        const { data, error } = await supabase
            .from('allergies')
            .insert([newRecord])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ data: null, error: { code: 'insert_failed', message: error.message } }, { status: 500 });
        }

        return NextResponse.json({ data, error: null }, { status: 201 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ data: null, error: { code: 'unauthorized', message } }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
