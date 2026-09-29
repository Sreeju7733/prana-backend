import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken } from '@/lib/auth';
import { 
  generateResponderKeys, 
  generateSigningKeys,
  encrypt, 
  sign,
  buildQr,
  qrToBase45,
  type QrHeader 
} from '@/lib/prana-qr/encrypt';
import { pack, type PatientData } from '@/lib/prana-qr/pack';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load keys from environment or files
function loadEnvVar(name: string): string {
  return process.env[name] || '';
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── GET /api/card/qr ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    
    // Fetch patient data from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // Fetch allergies
    const { data: allergies, error: allergyError } = await supabase
      .from('allergies')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_critical', true);

    if (allergyError) {
      return NextResponse.json({ success: false, error: allergyError.message }, { status: 500 });
    }

    // Fetch medications
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (medError) {
      return NextResponse.json({ success: false, error: medError.message }, { status: 500 });
    }

    // Fetch conditions
    const { data: conditions, error: condError } = await supabase
      .from('conditions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (condError) {
      return NextResponse.json({ success: false, error: condError.message }, { status: 500 });
    }

    // Fetch emergency contacts
    const { data: contacts, error: contactError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .limit(1);

    if (contactError) {
      return NextResponse.json({ success: false, error: contactError.message }, { status: 500 });
    }

    // Load cryptographic keys from environment
    const responderPubHex = loadEnvVar('RESPONDER_PUBLIC_KEY');
    const responderPrivHex = loadEnvVar('RESPONDER_PRIVATE_KEY');
    const signingPubHex = loadEnvVar('SIGNING_PUBLIC_KEY');
    const signingPrivHex = loadEnvVar('SIGNING_PRIVATE_KEY');
    
    if (!responderPubHex || !responderPrivHex || !signingPubHex || !signingPrivHex) {
      return NextResponse.json({ success: false, error: 'Cryptographic keys not configured' }, { status: 500 });
    }

    const responderPublicKey = hexToUint8Array(responderPubHex);
    const responderPrivateKey = hexToUint8Array(responderPrivHex);
    const signingPublicKey = hexToUint8Array(signingPubHex);
    const signingPrivateKey = hexToUint8Array(signingPrivHex);

    // Build patient data for packing
    const patientData: PatientData = {
      pranaId: profile.prana_id,
      name: profile.full_name || '',
      age: profile.age || 0,
      gender: profile.gender || 'Male',
      bloodGroup: profile.blood_group || 'Unknown',
      allergies: (allergies || []).map(a => ({
        allergen: a.allergen,
        severity: a.severity || 'moderate',
      })),
      criticalFlags: [
        ...(profile.flags || []).filter((f: string) => f),
      ],
      medicines: (medications || []).map(m => ({
        name: m.name,
        dose: m.dose || '',
        frequency: m.frequency || 'OD',
      })),
      conditions: (conditions || []).map(c => ({
        code: c.icd10_code || '',
        name: c.name,
        status: c.status || 'active',
      })),
      notes: profile.notes ? [profile.notes] : [],
      emergencyContact: contacts?.[0] ? {
        name: contacts[0].name,
        phone: contacts[0].phone_number || contacts[0].encrypted_phone || '',
        relationship: contacts[0].relationship,
      } : undefined,
      lastHospitalVisit: undefined, // Would need separate query
    };

    // Build QR header
    const header: QrHeader = {
      version: 1,
      age: patientData.age,
      gender: patientData.gender === 'Female' ? 1 : patientData.gender === 'Other' ? 2 : 0,
      bloodGroupIdx: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].indexOf(patientData.bloodGroup) || 0,
      pranaIdSuffix: patientData.pranaId.replace('PRAN-', ''),
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Build QR with real keys from environment
    const components = buildQr(
      patientData,
      header,
      responderPrivateKey,
      signingPrivateKey,
      responderPublicKey,
      signingPublicKey,
    );

    // Convert to Base45
    const qrString = qrToBase45(components);

    // Calculate expiry (30 days from now)
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        qr_string: qrString,
        prana_id: patientData.pranaId,
        version: 1,
        expires_at: expiry,
        size_bytes: qrString.length,
      },
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST /api/card/regenerate ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    
    // Force regenerate the QR
    const response = await GET(req);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
