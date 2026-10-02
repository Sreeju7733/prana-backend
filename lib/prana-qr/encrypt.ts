/**
 * PRANA QR Encryption & Signing
 * 
 * Uses ECIES (Elliptic Curve Integrated Encryption Scheme):
 * - Ephemeral X25519 key pair for key exchange
 * - AES-256-GCM for data encryption
 * - Ed25519 for signature
 * 
 * QR format: header(47 bytes) + encrypted_data(variable) + signature(32 bytes)
 */

import { x25519, ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes } from '@noble/curves/utils.js';
import { pack, type PatientData } from './pack';
import { base45Encode } from './base45';
import { type QrHeader, buildQrHeader } from './base45';
import * as crypto from 'crypto';

export type { QrHeader };

// Key types
export interface ResponderKeyPair {
  privateKey: Uint8Array;  // 32 bytes
  publicKey: Uint8Array;   // 32 bytes
  version: number;
  expiresAt: number;       // unix timestamp
}

export interface SigningKeyPair {
  privateKey: Uint8Array;  // 32 bytes
  publicKey: Uint8Array;   // 32 bytes
  version: number;
}

// ─── Generate Key Pairs ─────────────────────────────────────────────────────
export function generateResponderKeys(version: number = 1, daysUntilExpiry: number = 30): ResponderKeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    version,
    expiresAt: Math.floor(Date.now() / 1000) + (daysUntilExpiry * 86400),
  };
}

export function generateSigningKeys(version: number = 1): SigningKeyPair {
  const privateKey = randomBytes(32);
  const publicKey = ed25519.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    version,
  };
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────
interface EncryptedPayload {
  ephemeralPublicKey: Uint8Array;  // 32 bytes
  nonce: Uint8Array;               // 12 bytes
  ciphertext: Uint8Array;          // variable
  tag: Uint8Array;                 // 16 bytes
}

function deriveAesKey(sharedSecret: Uint8Array): Uint8Array {
  const hash = crypto.createHash('sha512').update(Buffer.from(sharedSecret)).digest();
  return hash.slice(0, 32);
}

export function encrypt(data: Uint8Array, responderPublicKey: Uint8Array): EncryptedPayload {
  // Generate ephemeral key pair
  const ephemeralPrivateKey = randomBytes(32);
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
  
  // Derive shared secret using X25519
  const shared = x25519.getSharedSecret(ephemeralPrivateKey, responderPublicKey);
  
  // Derive AES key from shared secret (SHA-512 -> first 32 bytes)
  const aesKey = deriveAesKey(shared);
  
  // Generate nonce
  const nonce = randomBytes(12);
  
  // Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, nonce);
  let encrypted = cipher.update(data);
  const finalBuf = cipher.final();
  encrypted = Buffer.concat([encrypted, finalBuf]);
  const tag = cipher.getAuthTag();
  
  return { ephemeralPublicKey, nonce, ciphertext: encrypted, tag };
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────
export function decrypt(
  encrypted: EncryptedPayload,
  responderPrivateKey: Uint8Array,
): Uint8Array | null {
  try {
    // Derive shared secret
    const shared = x25519.getSharedSecret(responderPrivateKey, encrypted.ephemeralPublicKey);
    
    // Derive AES key
    const aesKey = deriveAesKey(shared);
    
    // Reconstruct ciphertext + tag
    const combined = Buffer.concat([Buffer.from(encrypted.ciphertext), Buffer.from(encrypted.tag)]);
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, encrypted.nonce);
    decipher.setAuthTag(encrypted.tag);
    return decipher.update(combined);
  } catch {
    return null;
  }
}

// ─── Sign ────────────────────────────────────────────────────────────────────
export function sign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(data, privateKey);
}

export function verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  return ed25519.verify(signature, data, publicKey);
}

// ─── Build Full QR ───────────────────────────────────────────────────────────
export interface QrComponents {
  header: Uint8Array;
  encrypted: EncryptedPayload;
  signature: Uint8Array;
}

export function buildQr(
  patientData: PatientData,
  header: QrHeader,
  responderPrivateKey: Uint8Array,
  signingPrivateKey: Uint8Array,
  responderPublicKey: Uint8Array,
  signingPublicKey: Uint8Array,
): QrComponents {
  // Pack patient data
  const packed = pack(patientData);
  
  // Build header
  const headerBytes = buildQrHeader(header);
  
  // Encrypt packed data
  const encrypted = encrypt(packed.bytes, responderPublicKey);
  
  // Combine header + encrypted data for signing
  const combined = new Uint8Array(headerBytes.length + 
    encrypted.ephemeralPublicKey.length + 
    encrypted.nonce.length + 
    encrypted.ciphertext.length + 
    encrypted.tag.length);
  
  let offset = 0;
  combined.set(headerBytes, offset); offset += headerBytes.length;
  combined.set(encrypted.ephemeralPublicKey, offset); offset += encrypted.ephemeralPublicKey.length;
  combined.set(encrypted.nonce, offset); offset += encrypted.nonce.length;
  combined.set(encrypted.ciphertext, offset); offset += encrypted.ciphertext.length;
  combined.set(encrypted.tag, offset); offset += encrypted.tag.length;
  
  // Sign
  const signature = sign(combined, signingPrivateKey);
  
  return {
    header: headerBytes,
    encrypted,
    signature,
  };
}

export function qrToBase45(components: QrComponents): string {
  const total = components.header.length +
    components.encrypted.ephemeralPublicKey.length +
    components.encrypted.nonce.length +
    components.encrypted.ciphertext.length +
    components.encrypted.tag.length +
    components.signature.length;
  
  const combined = new Uint8Array(total);
  let offset = 0;
  combined.set(components.header, offset); offset += components.header.length;
  combined.set(components.encrypted.ephemeralPublicKey, offset); offset += components.encrypted.ephemeralPublicKey.length;
  combined.set(components.encrypted.nonce, offset); offset += components.encrypted.nonce.length;
  combined.set(components.encrypted.ciphertext, offset); offset += components.encrypted.ciphertext.length;
  combined.set(components.encrypted.tag, offset); offset += components.encrypted.tag.length;
  combined.set(components.signature, offset);
  
  return base45Encode(combined);
}
