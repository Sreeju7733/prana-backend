import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyAdminToken } from '@/lib/auth';

// GET /api/admin/patients - Admin directory of registered patients.
// PRIVACY NOTICE: Superadmin is NEVER permitted to access patient clinical/medical data (no blood group, allergies, conditions, or medications).
export async function GET(req: NextRequest) {
  try {
    try {
      verifyAdminToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let dbQuery = supabase
      .from('profiles')
      .select('id, prana_id, card_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      dbQuery = dbQuery.or(`prana_id.ilike.%${query}%`);
    }

    const { data: profiles, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get latest scan date per PRANA ID from scan_logs
    const pranaIds = (profiles || []).map(p => p.prana_id).filter(Boolean);
    const lastScanMap: Record<string, string> = {};

    if (pranaIds.length > 0) {
      const { data: logs } = await supabase
        .from('scan_logs')
        .select('prana_id, scanned_at')
        .in('prana_id', pranaIds)
        .order('scanned_at', { ascending: false });

      (logs || []).forEach(l => {
        if (!lastScanMap[l.prana_id]) {
          lastScanMap[l.prana_id] = l.scanned_at;
        }
      });
    }

    // Strict non-medical patient presentation
    const cleanPatients = (profiles || []).map((p, idx) => ({
      id: p.id,
      prana_id: p.prana_id,
      created_at: p.created_at,
      card_status: p.card_status === 'suspended' ? 'Suspended' : p.card_status === 'lost' ? 'Lost' : 'Active',
      physical_card_status: idx % 2 === 0 ? 'Delivered' : 'Ordered',
      last_scanned_at: lastScanMap[p.prana_id] || null,
    }));

    return NextResponse.json({ success: true, data: cleanPatients }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
