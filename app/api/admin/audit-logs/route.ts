import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyHospitalToken } from '@/lib/auth';

// GET /api/admin/audit-logs - Query scan events and access records
export async function GET(req: NextRequest) {
  try {
    let callerClaims;
    try {
      callerClaims = verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pranaId = searchParams.get('prana_id');
    const hospitalId = searchParams.get('hospital_id');

    let query = supabase
      .from('scan_logs')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit);

    // If hospital facility token, scope exclusively to records opened by this hospital
    if (callerClaims.role === 'hospital_facility') {
      const hospId = callerClaims.hospital_id;
      query = query.or(`hospital_id.eq.${hospId},responder_org.ilike.%${hospId}%,responder_org.ilike.%${callerClaims.hospital_name}%`);
    } else if (hospitalId) {
      query = query.eq('hospital_id', hospitalId);
    }

    if (pranaId) {
      query = query.eq('prana_id', pranaId.trim());
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: logs || []
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
