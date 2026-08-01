import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// POST /api/card/suspend - Suspend card
export async function POST(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json().catch(() => ({}));
        const reason = body.reason || 'User requested suspension';

        const { data, error } = await supabase
            .from('profiles')
            .update({ card_status: 'suspended', updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select('prana_id, card_status')
            .single();

        if (error) {
            return jsonResponse(null, { code: 'update_failed', message: error.message }, 500);
        }

        return jsonResponse({
            prana_id: data.prana_id,
            card_status: data.card_status,
            reason
        }, null, 200);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
