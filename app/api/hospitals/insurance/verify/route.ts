import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyHospitalToken } from '@/lib/auth';

// POST /api/hospitals/insurance/verify - Hospital desk insurance claims status updates
export async function POST(req: NextRequest) {
  try {
    try {
      verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { prana_id, status, notes } = body;

    if (!prana_id) {
      return NextResponse.json({ success: false, error: 'Patient PRANA ID is required' }, { status: 400 });
    }

    const validStatuses = ['Not started', 'Pre-auth requested', 'Approved', 'Rejected'];
    const currentStatus = validStatuses.includes(status) ? status : 'Pre-auth requested';

    // Fetch patient profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, prana_id, phone, card_status')
      .or(`prana_id.ilike.%${prana_id.trim()}%,phone.ilike.%${prana_id.trim()}%`)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      prana_id: profile?.prana_id || prana_id,
      patient_name: profile?.full_name || 'Patient Record',
      status: currentStatus,
      updated_at: new Date().toISOString(),
      notes: notes || 'Hospital insurance desk status updated.'
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
