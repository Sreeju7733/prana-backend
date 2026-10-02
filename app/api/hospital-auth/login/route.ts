import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/hospital-auth/login - Hospital staff / doctor login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hospital_id, doctor_id, registration_number, pin } = body;

    if (!hospital_id) {
      return NextResponse.json(
        { success: false, error: 'Hospital ID or Registration number is required' },
        { status: 400 }
      );
    }

    // 1. Look up hospital
    const cleanHosp = hospital_id.trim();
    const { data: hospitals, error: hospErr } = await supabase
      .from('verified_hospitals')
      .select('*')
      .or(`hospital_id.eq.${cleanHosp},registration_number.eq.${cleanHosp},name.ilike.%${cleanHosp}%`)
      .limit(1);

    if (hospErr) {
      return NextResponse.json({ success: false, error: hospErr.message }, { status: 500 });
    }

    const hospital = hospitals && hospitals.length > 0 ? hospitals[0] : null;

    if (!hospital) {
      return NextResponse.json(
        { success: false, error: 'Hospital facility not found or not registered in PRANA network' },
        { status: 404 }
      );
    }

    if (!hospital.is_active) {
      return NextResponse.json(
        { success: false, error: 'Hospital accreditation currently suspended by Superadmin' },
        { status: 403 }
      );
    }

    // 2. Doctor / Staff identity
    const staffDoctorId = doctor_id?.trim() || 'DOC-DUTY-101';
    const staffName = body.doctor_name?.trim() || `Duty Physician (${staffDoctorId})`;
    const staffDepartment = body.department?.trim() || 'Emergency Medicine & Trauma';

    // 3. Issue Hospital Session JWT Token
    const token = jwt.sign(
      {
        hospital_uuid: hospital.id,
        hospital_id: hospital.hospital_id,
        hospital_name: hospital.name,
        doctor_id: staffDoctorId,
        doctor_name: staffName,
        department: staffDepartment,
        role: 'hospital_physician',
        tier_access: ['green', 'yellow', 'red']
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return NextResponse.json({
      success: true,
      token,
      hospital: {
        id: hospital.id,
        hospital_id: hospital.hospital_id,
        name: hospital.name,
        registration_number: hospital.registration_number,
        city: hospital.city,
        state: hospital.state,
      },
      staff: {
        doctor_id: staffDoctorId,
        doctor_name: staffName,
        department: staffDepartment,
      }
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
