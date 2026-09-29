import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import { decodeQr } from '@/lib/prana-qr/scanner-utils';

// GET /api/scan/decode - Decode a scanned QR code
export async function GET(req: NextRequest) {
  try {
    const qrString = req.nextUrl.searchParams.get('qr');
    if (!qrString) {
      return NextResponse.json({ success: false, error: 'qr parameter required' }, { status: 400 });
    }

    const responderPrivHex = process.env.RESPONDER_PRIVATE_KEY || '';
    const signingPubHex = process.env.SIGNING_PUBLIC_KEY || '';

    if (!responderPrivHex || !signingPubHex) {
      return NextResponse.json({ success: false, error: 'Keys not configured' }, { status: 500 });
    }

    // Load revocation list
    const { data: revoked } = await supabase
      .from('profiles')
      .select('prana_id')
      .eq('card_status', 'suspended');
    
    const revocationList = (revoked || []).map((p: { prana_id: string }) => p.prana_id);

    const result = await decodeQr(qrString, responderPrivHex, signingPubHex, revocationList);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      isRevoked: result.isRevoked,
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
