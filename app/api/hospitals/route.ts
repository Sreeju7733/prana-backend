import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

// GET /api/hospitals - List all registered hospitals (with optional search)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';

    let dbQuery = supabase
      .from('verified_hospitals')
      .select('*')
      .order('created_at', { ascending: false });

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,hospital_id.ilike.%${query}%,registration_number.ilike.%${query}%`);
    }

    if (city) {
      dbQuery = dbQuery.ilike('city', `%${city}%`);
    }

    const { data: hospitals, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Also get responders count per hospital if possible
    const { data: responders } = await supabase
      .from('verified_responders')
      .select('organization, is_active');

    const countsByOrg: Record<string, number> = {};
    (responders || []).forEach(r => {
      const org = r.organization || 'General';
      countsByOrg[org] = (countsByOrg[org] || 0) + 1;
    });

    const enriched = (hospitals || []).map(h => ({
      ...h,
      staff_count: countsByOrg[h.name] || countsByOrg[h.hospital_id] || 0
    }));

    return NextResponse.json({ success: true, data: enriched }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/hospitals - Register a new verified hospital (Superadmin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, registration_number, address, city, state, country = 'IN', hospital_id } = body;

    if (!name || !registration_number) {
      return NextResponse.json(
        { success: false, error: 'Hospital Name and Registration Number are required' },
        { status: 400 }
      );
    }

    // Generate unique hospital_id if not provided
    const cleanId = (hospital_id && String(hospital_id).trim()) || 
      `HOSP-${name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('verified_hospitals')
      .insert({
        hospital_id: cleanId,
        name: name.trim(),
        registration_number: registration_number.trim(),
        address: address?.trim() || null,
        city: city?.trim() || 'New Delhi',
        state: state?.trim() || 'Delhi',
        country: country || 'IN',
        is_active: true,
        verified_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH /api/hospitals - Toggle active status or update details
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active, name, address, city, state } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hospital ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (name) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (city) updates.city = city;
    if (state) updates.state = state;

    const { data, error } = await supabase
      .from('verified_hospitals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/hospitals - Remove hospital
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Hospital UUID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('verified_hospitals')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Hospital removed' }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
