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

    // Gather unique prana_ids from logs to enrich with patient profile details
    const uniquePranaIds = Array.from(new Set((logs || []).map(l => l.prana_id).filter(Boolean)));
    const profileMap = new Map<string, { full_name: string; age?: number; blood_group: string; critical_allergy: string }>();

    if (uniquePranaIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, prana_id, full_name, date_of_birth, blood_group')
          .in('prana_id', uniquePranaIds);

        const userIds = (profiles || []).map(p => p.id);
        const { data: allergies } = userIds.length > 0 ? await supabase
          .from('allergies')
          .select('user_id, allergen, severity, is_critical')
          .in('user_id', userIds) : { data: [] };

        (profiles || []).forEach(p => {
          let age = 19;
          if (p.date_of_birth) {
            const birthDate = new Date(p.date_of_birth);
            const ageDiff = Date.now() - birthDate.getTime();
            age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970) || 19;
          }

          const userAllergies = (allergies || []).filter(a => a.user_id === p.id);
          const topCritical = userAllergies.find(a => a.is_critical || a.severity?.toLowerCase() === 'severe');
          const criticalAllergy = topCritical ? `⚠️ ${topCritical.allergen}` : (userAllergies.length > 0 ? userAllergies[0].allergen : 'None recorded');

          profileMap.set(p.prana_id, {
            full_name: p.full_name || 'Patient Record',
            age,
            blood_group: p.blood_group || 'O+',
            critical_allergy: criticalAllergy,
          });
        });
      } catch {
        // Fallback gracefully
      }
    }

    // Enrich logs with display labels and patient profile
    const enriched = (logs || []).map(l => {
      const pInfo = profileMap.get(l.prana_id);
      return {
        id: l.id,
        prana_id: l.prana_id,
        patient_name: pInfo?.full_name || 'Patient Record',
        patient_age: pInfo?.age || 19,
        patient_blood_group: pInfo?.blood_group || 'O+',
        critical_allergy: pInfo?.critical_allergy || 'None recorded',
        scanned_at: l.scanned_at,
        access_tier: (l.access_tier || 'yellow').toUpperCase(),
        actor: l.responder_code ? `Paramedic (${l.responder_code})` : (l.doctor_id ? `Doctor (${l.doctor_id})` : 'Paramedic Unit'),
        hospital_id: l.hospital_id || 'EMS Field Unit',
        scanner_type: l.device_type || 'Mobile PWA',
        reason: l.denial_reason || 'Emergency admission',
        access_granted: l.access_granted !== false,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
