import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/paramedic/login - Authenticate emergency paramedic / responder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { responder_code, employee_id, phone, hospital_id } = body;

    if (!responder_code && !phone) {
      return NextResponse.json(
        { success: false, error: 'Responder badge code or phone number is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('verified_responders').select('*');

    if (responder_code) {
      query = query.eq('responder_code', responder_code.trim());
    } else if (phone) {
      query = query.eq('phone', phone.trim());
    }

    const { data: responders, error } = await query.limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let responder = responders && responders.length > 0 ? responders[0] : null;

    // Auto-provision demo paramedic badge if code starts with PARAM or DEMO and not found
    if (!responder && responder_code && (responder_code.startsWith('PARAM') || responder_code.startsWith('RESP') || responder_code.startsWith('DEMO'))) {
      const newResponder = {
        responder_code: responder_code.trim().toUpperCase(),
        employee_id: employee_id?.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: employee_id ? `Paramedic (${employee_id})` : 'Emergency Medical Officer',
        phone: phone?.trim() || '9876543210',
        organization: hospital_id || 'Emergency Medical Services (EMS)',
        organization_type: 'ambulance',
        is_active: true,
        last_verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data: created, error: createErr } = await supabase
        .from('verified_responders')
        .insert(newResponder)
        .select()
        .single();

      if (!createErr && created) {
        responder = created;
      }
    }

    if (!responder) {
      return NextResponse.json(
        { success: false, error: 'Responder badge not recognized or authorization expired.' },
        { status: 401 }
      );
    }

    if (!responder.is_active) {
      return NextResponse.json(
        { success: false, error: 'Responder credentials suspended by Superadmin.' },
        { status: 403 }
      );
    }

    // Check expiration
    if (responder.expires_at && new Date(responder.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Responder badge expired. Please re-authenticate with Superadmin.' },
        { status: 403 }
      );
    }

    // Issue responder JWT token with Yellow/Red Tier clearance
    const token = jwt.sign(
      {
        id: responder.id,
        responder_code: responder.responder_code,
        name: responder.name,
        role: 'paramedic',
        organization: responder.organization,
        organization_type: responder.organization_type,
        tier_access: ['green', 'yellow', 'red']
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last_verified_at
    await supabase
      .from('verified_responders')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', responder.id);

    return NextResponse.json({
      success: true,
      token,
      responder: {
        id: responder.id,
        responder_code: responder.responder_code,
        name: responder.name,
        employee_id: responder.employee_id,
        organization: responder.organization,
        organization_type: responder.organization_type,
        phone: responder.phone,
        expires_at: responder.expires_at,
        is_active: responder.is_active
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
