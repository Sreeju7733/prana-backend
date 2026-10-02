import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyHospitalToken } from '@/lib/auth';

// GET /api/responders - List verified responders / paramedics (Scoped by caller)
export async function GET(req: NextRequest) {
  try {
    let callerClaims;
    try {
      callerClaims = verifyHospitalToken(req);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication token required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const org = searchParams.get('org');
    const query = searchParams.get('q');

    let dbQuery = supabase
      .from('verified_responders')
      .select('*')
      .order('created_at', { ascending: false });

    // If caller is a hospital (not superadmin), strictly scope to their own facility
    if (callerClaims.role === 'hospital_facility') {
      const hospName = callerClaims.hospital_name || '';
      const hospId = callerClaims.hospital_id || '';
      dbQuery = dbQuery.or(`organization.ilike.%${hospName}%,organization.ilike.%${hospId}%`);
    } else if (org) {
      dbQuery = dbQuery.eq('organization', org);
    }

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,responder_code.ilike.%${query}%,employee_id.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/responders - Superadmin or hospital provisions a new responder
export async function POST(req: NextRequest) {
  try {
    let callerClaims;
    try {
      callerClaims = verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, responder_code, employee_id, phone, organization, organization_type = 'hospital' } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and Phone are required' }, { status: 400 });
    }

    const generatedCode = responder_code?.trim() || `RESP-${Math.floor(100000 + Math.random() * 900000)}`;
    const generatedEmpId = employee_id?.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const assignedOrg = callerClaims.role === 'hospital_facility' ? callerClaims.hospital_name : (organization?.trim() || 'General Emergency Services');

    const { data, error } = await supabase
      .from('verified_responders')
      .insert({
        name: name.trim(),
        responder_code: generatedCode.toUpperCase(),
        employee_id: generatedEmpId,
        phone: phone.trim(),
        organization: assignedOrg,
        organization_type: organization_type || 'hospital',
        is_active: true,
        last_verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
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

// PATCH /api/responders - Toggle status or renew validity
export async function PATCH(req: NextRequest) {
  try {
    try {
      verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_active, renew } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Responder ID required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (renew) {
      updates.expires_at = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      updates.last_verified_at = new Date().toISOString();
      updates.is_active = true;
    }

    const { data, error } = await supabase
      .from('verified_responders')
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

// DELETE /api/responders - Delete responder
export async function DELETE(req: NextRequest) {
  try {
    try {
      verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Responder ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('verified_responders')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Responder removed' }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
