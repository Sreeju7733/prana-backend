import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// GET /api/health/summary - Independent fetch for Health tab
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const [{ data: allergies }, { data: medications }, { data: conditions }] = await Promise.all([
            supabase.from('allergies').select('id, allergen, severity, is_critical').eq('user_id', user.id),
            supabase.from('medications').select('id, name, dose, frequency, is_active').eq('user_id', user.id),
            supabase.from('conditions').select('id, name, status, diagnosed_date').eq('user_id', user.id)
        ]);

        return jsonResponse({
            allergies: allergies || [],
            medications: medications || [],
            conditions: conditions || []
        }, null, 200);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
