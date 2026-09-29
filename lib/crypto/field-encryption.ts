/**
 * Field-level encryption for sensitive data (phone numbers, etc.)
 * Uses AES-256-GCM with a key derived from FIELD_ENCRYPTION_KEY env var.
 * Format: v1:<base64 nonce>:<base64 ciphertext>:<base64 tag>
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // bytes for AES-256
const NONCE_LENGTH = 12; // bytes
const TAG_LENGTH = 16; // bytes
const FORMAT_VERSION = 'v1';

function getKey(): Buffer {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('FIELD_ENCRYPTION_KEY not set in environment');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex chars)`);
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  const final = cipher.final();
  encrypted = Buffer.concat([encrypted, final]);
  const tag = cipher.getAuthTag();
  
  // Format: v1:<base64 nonce>:<base64 ciphertext>:<base64 tag>
  return `${FORMAT_VERSION}:${nonce.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText.startsWith(`${FORMAT_VERSION}:`)) {
    // Not encrypted - return as-is (backwards compatibility with old data)
    return encryptedText;
  }
  
  const parts = encryptedText.substring(FORMAT_VERSION.length + 1).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const key = getKey();
  const nonce = Buffer.from(parts[0], 'base64');
  const encrypted = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  const final = decipher.final();
  return Buffer.concat([decrypted, final]).toString('utf8');
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${FORMAT_VERSION}:`);
}
