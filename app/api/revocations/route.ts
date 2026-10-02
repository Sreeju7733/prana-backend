import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyToken, signToken } from '@/lib/auth';
import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes } from '@noble/curves/utils.js';
import * as crypto from 'crypto';

// ─── GET /api/revocations ───────────────────────────────────────────────────
// Returns list of revoked PRANA IDs, signed so responders can verify integrity
export async function GET(req: NextRequest) {
  try {
    const signingPrivHex = process.env.SIGNING_PRIVATE_KEY || '';
    if (!signingPrivHex) {
      return NextResponse.json({ success: false, error: 'Signing key not configured' }, { status: 500 });
    }

    const { data: revoked, error } = await supabase
      .from('profiles')
      .select('prana_id, card_status, suspended_at')
      .eq('card_status', 'suspended')
      .or('revoked.eq,true');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const list = (revoked || []).map(p => ({
      prana_id: p.prana_id,
      suspended_at: p.suspended_at || new Date().toISOString(),
    }));

    // Sign the list
    const privateKey = Buffer.from(signingPrivHex, 'hex');
    const payload = JSON.stringify(list);
    const signature = ed25519.sign(payload, privateKey);

    return NextResponse.json({
      success: true,
      data: {
        revocations: list,
        count: list.length,
        signature: Buffer.from(signature).toString('hex'),
        signed_at: new Date().toISOString(),
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST /api/revocations ──────────────────────────────────────────────────
// Suspend / reactivate a card or log scan entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // 'suspend', 'reactivate', or 'log_scan'

    if (action === 'log_scan' || body.prana_id && !action) {
      if (!body.prana_id) {
        return NextResponse.json({ success: false, error: 'prana_id is required' }, { status: 400 });
      }

      const scanEntry = {
        prana_id: body.prana_id,
        responder_id: body.responder_id || null,
        location_city: body.location_city || null,
        location_country: body.location_country || null,
        gps_coordinates: body.gps_coordinates || null,
        scanner_type: body.scanner_type || 'web',
        user_agent: body.user_agent || null,
        access_tier: body.access_tier || 'Green Tier',
        accessed_data_summary: body.accessed_data_summary || null,
      };

      const { data, error } = await supabase
        .from('scan_logs')
        .insert([scanEntry])
        .select('id, prana_id, scanned_at')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data,
      }, { status: 201 });
    }

    const user = verifyToken(req);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, prana_id')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    if (action === 'suspend') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ card_status: 'suspended', suspended_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Card ${profile.prana_id} has been suspended`,
      }, { status: 200 });

    } else if (action === 'reactivate') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ card_status: 'active', suspended_at: null })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Card ${profile.prana_id} has been reactivated`,
      }, { status: 200 });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
