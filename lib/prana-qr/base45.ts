import { type PatientData } from './pack.js';

// ─── Base45 Encoding (RFC 9246) ──────────────────────────────────────────────
const BASE45_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

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

export function base45Decode(str: string): Uint8Array {
  if (!str) return new Uint8Array(0);
  
  let num = 0n;
  for (const ch of str) {
    const idx = BASE45_CHARS.indexOf(ch);
    if (idx < 0) continue; // skip invalid chars
    num = num * 45n + BigInt(idx);
  }
  
  if (num === 0n) return new Uint8Array(1); // empty input → single zero byte
  
  // Convert back to bytes
  const hex = num.toString(16);
  const padded = hex.length % 2 === 1 ? '0' + hex : hex;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < padded.length; i += 2) {
    bytes[i / 2] = parseInt(padded.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── QR Header Format ────────────────────────────────────────────────────────
// Byte layout:
// 0:     Format version (0x01 = PRANA_V2)
// 1:     Age (1 byte, 0-150)
// 2:     Gender (1 byte: 0=Male, 1=Female, 2=Other)
// 3:     Blood group index (1 byte, 0-7)
// 4-20:  Prana ID suffix (17 bytes, null-padded)
// 21-40: Packed medical data (variable, up to 150 bytes)
// 41-46: Timestamp (8 bytes, big-endian int64)
// 47-49: Signature (32 bytes, Ed25519)

export interface QrHeader {
  version: number;        // 0x01
  age: number;
  gender: number;         // 0=Male, 1=Female, 2=Other
  bloodGroupIdx: number;  // 0-7
  pranaIdSuffix: string;  // trimmed from PRAN-XXXXXXX
  timestamp: number;      // unix epoch seconds
}

export function buildQrHeader(header: QrHeader): Uint8Array {
  const buf = new Uint8Array(47);
  // Version
  buf[0] = header.version;
  // Age
  buf[1] = header.age & 0xFF;
  // Gender
  buf[2] = header.gender & 0xFF;
  // Blood group
  buf[3] = header.bloodGroupIdx & 0xFF;
  // Prana ID suffix (17 bytes, null-padded)
  const suffixBytes = new TextEncoder().encode(header.pranaIdSuffix.padEnd(17).substring(0, 17));
  for (let i = 0; i < suffixBytes.length; i++) {
    buf[4 + i] = suffixBytes[i];
  }
  // Timestamp (8 bytes, big-endian int64)
  let ts = BigInt(header.timestamp);
  for (let i = 7; i >= 0; i--) {
    buf[30 + i] = Number(ts & 0xFFn);
    ts >>= 8n;
  }
  return buf;
}
