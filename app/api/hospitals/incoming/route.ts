import { NextRequest, NextResponse } from 'next/server';
import { verifyHospitalToken } from '@/lib/auth';

// In-memory fallback if table is not yet migrated in Supabase
interface IncomingPatientRecord {
  id: string;
  prana_id: string;
  patient_name: string;
  age: number;
  gender: string;
  blood_group: string;
  allergies: string[];
  paramedic_code: string;
  paramedic_name: string;
  ambulance_unit: string;
  destination_hospital_id: string;
  destination_hospital_name: string;
  eta_minutes: number;
  condition_summary: string;
  vitals: {
    bp: string;
    pulse: string;
    spo2: string;
  };
  dispatched_at: string;
}

// Initial demonstration data for incoming ambulance transit
const mockTransits: IncomingPatientRecord[] = [
  {
    id: 'TRANSIT-8812',
    prana_id: 'PRAN-ba42c5c2',
    patient_name: 'Sreeju S',
    age: 19,
    gender: 'Male',
    blood_group: 'B+',
    allergies: ['Penicillin (Severe)', 'Sulfa Drugs'],
    paramedic_code: 'PARAM-7701',
    paramedic_name: 'Officer Rajesh Kumar',
    ambulance_unit: 'ALS Ambulance 108-DL-04',
    destination_hospital_id: 'HOSP-AIIMS-01',
    destination_hospital_name: 'AIIMS New Delhi - Trauma & Emergency Center',
    eta_minutes: 8,
    condition_summary: 'Acute vehicular trauma, stable airway, IV access established, prepared for emergency resuscitation.',
    vitals: {
      bp: '118/76',
      pulse: '92 bpm',
      spo2: '98%',
    },
    dispatched_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  }
];

// GET /api/hospitals/incoming - Retrieve incoming ambulance patients for this hospital
export async function GET(req: NextRequest) {
  try {
    let hospitalClaims;
    try {
      hospitalClaims = verifyHospitalToken(req);
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const hospId = hospitalClaims.hospital_id;

    // Filter by destination hospital
    const matched = mockTransits.filter(t => 
      !hospId || t.destination_hospital_id.toLowerCase().includes(hospId.toLowerCase()) || hospId.includes(t.destination_hospital_id)
    );

    return NextResponse.json({
      success: true,
      data: matched.length > 0 ? matched : mockTransits
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/hospitals/incoming - Paramedic registers incoming transit to a hospital
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prana_id,
      patient_name,
      blood_group,
      allergies,
      paramedic_code,
      destination_hospital_id,
      destination_hospital_name,
      eta_minutes,
      condition_summary
    } = body;

    const newTransit: IncomingPatientRecord = {
      id: `TRANSIT-${Math.floor(1000 + Math.random() * 9000)}`,
      prana_id: prana_id || 'PRAN-UNKNOWN',
      patient_name: patient_name || 'Emergency Casualty',
      age: body.age || 28,
      gender: body.gender || 'Unknown',
      blood_group: blood_group || 'O+',
      allergies: allergies || [],
      paramedic_code: paramedic_code || 'PARAM-ALS',
      paramedic_name: body.paramedic_name || 'Emergency First Responder',
      ambulance_unit: body.ambulance_unit || 'EMS Unit 1',
      destination_hospital_id: destination_hospital_id || 'HOSP-AIIMS-01',
      destination_hospital_name: destination_hospital_name || 'AIIMS New Delhi',
      eta_minutes: eta_minutes || 10,
      condition_summary: condition_summary || 'Transit in progress',
      vitals: body.vitals || { bp: '120/80', pulse: '88 bpm', spo2: '99%' },
      dispatched_at: new Date().toISOString()
    };

    mockTransits.unshift(newTransit);

    return NextResponse.json({ success: true, data: newTransit }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
