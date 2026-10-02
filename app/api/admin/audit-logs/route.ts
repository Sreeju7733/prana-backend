import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

// GET /api/admin/audit-logs - Superadmin query of all scan events and access records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pranaId = searchParams.get('prana_id');

    let query = supabase
      .from('scan_logs')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit);

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
