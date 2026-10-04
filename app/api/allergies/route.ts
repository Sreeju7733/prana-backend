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

// POST /api/allergies - Upsert a allergy record (supports client_uuid)
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

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

        const record = {
            user_id: user.id,
            allergen: allergenClean,
            severity: body.severity || null,
            reaction_description: body.reaction_description || body.reaction || null,
            date_diagnosed: body.date_diagnosed || body.diagnosed_at || null,
            is_critical: Boolean(body.is_critical),
            client_uuid: body.id || null,
            updated_at: new Date().toISOString()
        };

        let data: unknown = null;
        let error: Error | { message: string } | null = null;

        if (body.id) {
            const res = await supabase
                .from('allergies')
                .upsert(record, { onConflict: 'client_uuid' })
                .select()
                .single();
            data = res.data;
            error = res.error;
        } else {
            const res = await supabase
                .from('allergies')
                .insert([record])
                .select()
                .single();
            data = res.data;
            error = res.error;
        }

        if (error) {
            return NextResponse.json({ data: null, error: { code: 'insert_failed', message: error.message } }, { status: 500 });
        }

        return NextResponse.json({ data, error: null }, { status: body.id ? 200 : 201 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ data: null, error: { code: 'unauthorized', message } }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
