/**
 * PRANA QR Scanner Utilities
 * Handles Base45 decoding, Ed25519 verification, X25519 decryption, and unpacking
 */

import { x25519, ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/curves/utils';
import * as crypto from 'crypto';
import { unpack, type UnpackedData } from '@/lib/prana-qr/unpack';

const BASE45_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function base45Decode(str: string): Uint8Array {
  if (!str) return new Uint8Array(0);
  
  let num = 0n;
  for (const ch of str) {
    const idx = BASE45_CHARS.indexOf(ch);
    if (idx < 0) continue;
    num = num * 45n + BigInt(idx);
  }
  
  if (num === 0n) return new Uint8Array(1);
  
  const hex = num.toString(16);
  const padded = hex.length % 2 === 1 ? '0' + hex : hex;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < padded.length; i += 2) {
    bytes[i / 2] = parseInt(padded.substring(i, i + 2), 16);
  }
  return bytes;
}

export function base45Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const b of bytes) {
    num = num * 256n + BigInt(b);
  }
  if (num === 0n) return bytes.length === 0 ? '' : '0';
  
  const digits: number[] = [];
  let temp = num;
  while (temp > 0n) {
    digits.push(Number(temp % 45n));
    temp /= 45n;
  }
  
  return digits.reverse().map(d => BASE45_CHARS[d]).join('');
}

// ─── QR Components ───────────────────────────────────────────────────────────
export interface QrComponents {
  version: number;
  age: number;
  gender: number;
  bloodGroupIdx: number;
  pranaIdSuffix: string;
  timestamp: number;
  encrypted: {
    ephemeralPublicKey: Uint8Array;
    nonce: Uint8Array;
    ciphertext: Uint8Array;
    tag: Uint8Array;
  };
  signature: Uint8Array;
}

// ─── Parse QR string ─────────────────────────────────────────────────────────
export function parseQrString(qrString: string): QrComponents | null {
  try {
    const bytes = base45Decode(qrString.trim());
    
    // Header is 47 bytes
    if (bytes.length < 47) return null;
    
    const version = bytes[0];
    const age = bytes[1];
    const gender = bytes[2];
    const bloodGroupIdx = bytes[3];
    
    // Prana ID suffix (17 bytes, null-padded)
    let pranaIdSuffix = '';
    for (let i = 4; i < 21; i++) {
      if (bytes[i] === 0) break;
      pranaIdSuffix += String.fromCharCode(bytes[i]);
    }
    
    // Timestamp (8 bytes, big-endian int64)
    let ts = 0n;
    for (let i = 30; i < 38; i++) {
      ts = (ts << 8n) | BigInt(bytes[i]);
    }
    const timestamp = Number(ts);
    
    // Encrypted payload starts at byte 47
    const encStart = 47;
    const ephemeralPublicKey = bytes.subarray(encStart, encStart + 32);
    const nonce = bytes.subarray(encStart + 32, encStart + 44);
    const ctTl = bytes.length - encStart - 32 - 12 - 32; // remaining after sig
    const ciphertext = bytes.subarray(encStart + 44, encStart + 44 + ctTl - 16);
    const tag = bytes.subarray(encStart + 44 + ctTl - 16, encStart + 44 + ctTl);
    const signature = bytes.subarray(encStart + 44 + ctTl);
    
    return {
      version, age, gender, bloodGroupIdx, pranaIdSuffix, timestamp,
      encrypted: { ephemeralPublicKey, nonce, ciphertext, tag },
      signature,
    };
  } catch {
    return null;
  }
}

// ─── Decrypt & Verify ────────────────────────────────────────────────────────
export interface DecodedPatientData {
  success: boolean;
  data?: UnpackedData;
  error?: string;
  isRevoked?: boolean;
}

export async function decodeQr(
  qrString: string,
  responderPrivateKeyHex: string,
  signingPublicKeyHex: string,
  revocationList?: string[],
): Promise<DecodedPatientData> {
  const components = parseQrString(qrString);
  if (!components) {
    return { success: false, error: 'Invalid QR format - could not parse Base45 data' };
  }
  
  // Check expiry (30 days)
  const expiryMs = components.timestamp * 1000 + (30 * 24 * 60 * 60 * 1000);
  if (Date.now() > expiryMs) {
    return { success: false, error: 'QR code has expired' };
  }
  
  // Verify signature
  const signingPubKey = Buffer.from(signingPublicKeyHex, 'hex');
  const dataForSignature = new Uint8Array(
    components.encrypted.ephemeralPublicKey.length +
    components.encrypted.nonce.length +
    components.encrypted.ciphertext.length +
    components.encrypted.tag.length
  );
  let offset = 0;
  dataForSignature.set(components.encrypted.ephemeralPublicKey, offset); offset += 32;
  dataForSignature.set(components.encrypted.nonce, offset); offset += 12;
  dataForSignature.set(components.encrypted.ciphertext, offset); offset += components.encrypted.ciphertext.length;
  dataForSignature.set(components.encrypted.tag, offset);
  
  const sigValid = ed25519.verify(components.signature, dataForSignature, signingPubKey);
  if (!sigValid) {
    return { success: false, error: '⚠️ Signature verification failed — card may be fake or tampered' };
  }
  
  // Decrypt
  const responderPrivateKey = Buffer.from(responderPrivateKeyHex, 'hex');
  const shared = x25519.getSharedSecret(responderPrivateKey, components.encrypted.ephemeralPublicKey);
  const hash = crypto.createHash('sha512').update(Buffer.from(shared)).digest();
  const aesKey = hash.slice(0, 32);
  
  const combined = Buffer.concat([
    Buffer.from(components.encrypted.ciphertext),
    Buffer.from(components.encrypted.tag),
  ]);
  
  let decrypted: Buffer;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, components.encrypted.nonce);
    decipher.setAuthTag(components.encrypted.tag);
    decrypted = decipher.update(combined);
  } catch {
    return { success: false, error: 'Decryption failed — key mismatch or corrupted data' };
  }
  
  // Unpack
  let unpacked: UnpackedData;
  try {
    unpacked = unpack(decrypted as unknown as Uint8Array);
  } catch (e) {
    return { success: false, error: `Unpack error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
  
  // Check revocation
  const pranaId = `PRAN-${unpacked.pranaId.substring(0, 7)}`;
  const isRevoked = revocationList?.includes(pranaId) || revocationList?.includes(unpacked.pranaId);
  
  return {
    success: true,
    data: unpacked,
    isRevoked,
  };
}
