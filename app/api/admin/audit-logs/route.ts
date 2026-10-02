import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyAdminToken, verifyHospitalToken } from '@/lib/auth';

// GET /api/admin/audit-logs - Query scan events and access records
export async function GET(req: NextRequest) {
  try {
    let isSuperAdmin = false;
    let hospitalClaims: { role: string; hospital_id?: string } | null = null;
    try {
      verifyAdminToken(req);
      isSuperAdmin = true;
    } catch {
      // Try hospital token if not superadmin
      try {
        hospitalClaims = verifyHospitalToken(req);
        if (hospitalClaims.role === 'superadmin') isSuperAdmin = true;
      } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pranaId = searchParams.get('prana_id');
    const hospitalId = !isSuperAdmin && hospitalClaims?.hospital_id ? hospitalClaims.hospital_id : searchParams.get('hospital_id');
    const tier = searchParams.get('tier');

    let query = supabase
      .from('scan_logs')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (hospitalId) {
      query = query.eq('hospital_id', hospitalId);
    }

    if (tier) {
      query = query.ilike('access_tier', `%${tier}%`);
    }

    if (pranaId) {
      query = query.eq('prana_id', pranaId.trim());
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Enrich logs with display labels
    const enriched = (logs || []).map(l => ({
      id: l.id,
      prana_id: l.prana_id,
      scanned_at: l.scanned_at,
      access_tier: (l.access_tier || 'yellow').toUpperCase(),
      actor: l.responder_code ? `Paramedic (${l.responder_code})` : (l.doctor_id ? `Doctor (${l.doctor_id})` : 'Paramedic Unit'),
      hospital_id: l.hospital_id || 'EMS Field Unit',
      scanner_type: l.device_type || 'Mobile PWA',
      reason: l.denial_reason || 'Emergency medical triage scan',
      access_granted: l.access_granted !== false,
    }));

    return NextResponse.json({
      success: true,
      data: enriched
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
