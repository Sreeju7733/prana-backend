import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

function jsonResponse(data: unknown = null, error: unknown = null, status = 200) {
    return NextResponse.json({ data, error }, { status });
}

// GET /api/scans/recent?limit=5 - Paginated scan history activity feed
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);
        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 5;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('prana_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return jsonResponse(null, { code: 'profile_not_found', message: 'Profile not found' }, 404);
        }

        const { data: scanLogs, error } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('prana_id', profile.prana_id)
            .order('scanned_at', { ascending: false })
            .limit(limit);

        if (error) {
            return jsonResponse(null, { code: 'query_error', message: error.message }, 500);
        }

        const formattedScans = (scanLogs || []).map(scan => ({
            id: scan.id,
            access_tier: scan.access_tier || 'green',
            scanned_at: scan.scanned_at,
            location_lat: scan.location_lat ?? null,
            location_lng: scan.location_lng ?? null,
            responder_org: scan.responder_code ? `Responder (${scan.responder_code})` : 'Public Scanner',
            access_granted: scan.access_granted ?? true,
            denial_reason: scan.denial_reason || null
        }));

        return jsonResponse(formattedScans, null, 200);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return jsonResponse(null, { code: 'unauthorized', message }, 401);
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
