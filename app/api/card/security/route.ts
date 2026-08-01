import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/card/security - Returns card status, daily scan quota used, geo-restrictions, active hours
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('prana_id, card_status, daily_scan_limit, allowed_countries, active_hours_start, active_hours_end')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
        }

        // Calculate today's scans
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count: scansToday } = await supabase
            .from('scan_logs')
            .select('*', { count: 'exact', head: true })
            .eq('prana_id', profile.prana_id)
            .gte('scanned_at', startOfDay.toISOString());

        return NextResponse.json({
            success: true,
            data: {
                prana_id: profile.prana_id,
                card_status: profile.card_status,
                daily_scan_limit: profile.daily_scan_limit,
                scans_used_today: scansToday || 0,
                scans_remaining: Math.max(0, profile.daily_scan_limit - (scansToday || 0)),
                allowed_countries: profile.allowed_countries,
                active_hours_start: profile.active_hours_start,
                active_hours_end: profile.active_hours_end
            }
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

// PATCH /api/card/security - Toggle card active/suspended, set geo-restrictions or active hours
export async function PATCH(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const body = await req.json();

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (body.card_status !== undefined) {
            const ALLOWED_STATUS = ['active', 'suspended', 'deactivated'];
            if (!ALLOWED_STATUS.includes(body.card_status)) {
                return NextResponse.json({ success: false, error: `card_status must be one of: ${ALLOWED_STATUS.join(', ')}` }, { status: 400 });
            }
            updates.card_status = body.card_status;
        }

        if (body.daily_scan_limit !== undefined) {
            if (typeof body.daily_scan_limit !== 'number' || body.daily_scan_limit < 1) {
                return NextResponse.json({ success: false, error: 'daily_scan_limit must be a positive number' }, { status: 400 });
            }
            updates.daily_scan_limit = body.daily_scan_limit;
        }

        if (body.allowed_countries !== undefined) {
            if (!Array.isArray(body.allowed_countries)) {
                return NextResponse.json({ success: false, error: 'allowed_countries must be an array of country codes' }, { status: 400 });
            }
            updates.allowed_countries = body.allowed_countries;
        }

        if (body.active_hours_start !== undefined) updates.active_hours_start = body.active_hours_start;
        if (body.active_hours_end !== undefined) updates.active_hours_end = body.active_hours_end;

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select('prana_id, card_status, daily_scan_limit, allowed_countries, active_hours_start, active_hours_end')
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Card security settings updated successfully',
            data: updatedProfile
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
