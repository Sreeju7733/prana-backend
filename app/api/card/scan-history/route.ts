import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/card/scan-history - List history of QR scans for user's card
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch user's prana_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('prana_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
        }

        const { data: scanLogs, error } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('prana_id', profile.prana_id)
            .order('scanned_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: scanLogs || [] }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unauthorized access';
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
