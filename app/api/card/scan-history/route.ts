import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';

// GET /api/card/scan-history - List history of QR scans for user's card
export async function GET(req: NextRequest) {
    try {
        const user = verifyToken(req);

        // Fetch user's profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('prana_id')
            .eq('id', user.id)
            .maybeSingle();

        const pranaId = profile?.prana_id;
        if (!pranaId) {
            return NextResponse.json({ success: true, data: [] }, { status: 200 });
        }

        const { data: scanLogs, error } = await supabase
            .from('scan_logs')
            .select('*')
            .eq('prana_id', pranaId)
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
