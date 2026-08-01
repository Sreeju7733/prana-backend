import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

// GET /api/public/profiles/:user_id/critical-allergies - Emergency/Public GREEN Tier view
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ user_id: string }> }
) {
    try {
        const { user_id } = await context.params;

        if (!user_id) {
            return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        // Query only critical allergies with minimal fields for public display
        const { data, error } = await supabase
            .from('allergies')
            .select('allergen, severity, reaction_description')
            .eq('user_id', user_id)
            .eq('is_critical', true);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            public_tier: 'GREEN',
            critical_allergies: data || []
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
