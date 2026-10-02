import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

// GET /api/admin/metrics - Superadmin high-level system overview
export async function GET(req: NextRequest) {
  try {
    const [
      { count: hospitalCount },
      { count: activeHospitalCount },
      { count: responderCount },
      { count: activeResponderCount },
      { count: profileCount },
      { count: scanCount },
      { data: recentScans },
      { data: recentHospitals }
    ] = await Promise.all([
      supabase.from('verified_hospitals').select('*', { count: 'exact', head: true }),
      supabase.from('verified_hospitals').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('verified_responders').select('*', { count: 'exact', head: true }),
      supabase.from('verified_responders').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('scan_logs').select('*', { count: 'exact', head: true }),
      supabase.from('scan_logs').select('*').order('scanned_at', { ascending: false }).limit(8),
      supabase.from('verified_hospitals').select('*').order('created_at', { ascending: false }).limit(6)
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total_hospitals: hospitalCount || 0,
        active_hospitals: activeHospitalCount || 0,
        total_responders: responderCount || 0,
        active_responders: activeResponderCount || 0,
        total_patients: profileCount || 0,
        total_scans: scanCount || 0,
      },
      recent_scans: recentScans || [],
      recent_hospitals: recentHospitals || []
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
