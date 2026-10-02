import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

// GET /api/admin/patients - Search and retrieve registered patient profiles with health badges
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    let dbQuery = supabase
      .from('profiles')
      .select('id, full_name, phone, prana_id, blood_group, gender, date_of_birth, card_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,prana_id.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    const { data: profiles, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Enrich with counts of meds, allergies
    const userIds = (profiles || []).map(p => p.id);
    let allergiesMap: Record<string, number> = {};
    let medsMap: Record<string, number> = {};

    if (userIds.length > 0) {
      const [{ data: allergies }, { data: meds }] = await Promise.all([
        supabase.from('allergies').select('user_id'),
        supabase.from('medications').select('user_id')
      ]);

      (allergies || []).forEach(a => {
        allergiesMap[a.user_id] = (allergiesMap[a.user_id] || 0) + 1;
      });
      (meds || []).forEach(m => {
        medsMap[m.user_id] = (medsMap[m.user_id] || 0) + 1;
      });
    }

    const enriched = (profiles || []).map(p => ({
      ...p,
      allergies_count: allergiesMap[p.id] || 0,
      medications_count: medsMap[p.id] || 0,
    }));

    return NextResponse.json({ success: true, data: enriched }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
