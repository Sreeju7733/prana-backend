#!/usr/bin/env node
/**
 * Generate cryptographic keys for PRANA QR system
 * 
 * Usage: npx tsx scripts/generate-keys.ts [--output-dir ../.env]
 */

import { generateResponderKeys, generateSigningKeys } from '../lib/prana-qr/encrypt.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const outputDir = args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : '.secrets';

console.log('═══════════════════════════════════════════════════════════');
console.log('  PRANA QR Key Generation');
console.log('═══════════════════════════════════════════════════════════\n');

// Generate keys
console.log('Generating responder key pair (X25519)...');
const responderKeys = generateResponderKeys(1, 365); // 1 year expiry
console.log(`  Public Key (hex): ${Buffer.from(responderKeys.publicKey).toString('hex')}`);
console.log(`  Private Key (hex): ${Buffer.from(responderKeys.privateKey).toString('hex')}`);
console.log(`  Version: ${responderKeys.version}`);
console.log(`  Expires: ${new Date(responderKeys.expiresAt * 1000).toISOString()}\n`);

console.log('Generating signing key pair (Ed25519)...');
const signingKeys = generateSigningKeys(1);
console.log(`  Public Key (hex): ${Buffer.from(signingKeys.publicKey).toString('hex')}`);
console.log(`  Private Key (hex): ${Buffer.from(signingKeys.privateKey).toString('hex')}`);
console.log(`  Version: ${signingKeys.version}\n`);

// Save to files
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const responderPubPath = join(outputDir, 'RESPONDER_PUBLIC_KEY.hex');
const responderPrivPath = join(outputDir, 'RESPONDER_PRIVATE_KEY.hex');
const signingPubPath = join(outputDir, 'SIGNING_PUBLIC_KEY.hex');
const signingPrivPath = join(outputDir, 'SIGNING_PRIVATE_KEY.hex');
const keysJsonPath = join(outputDir, 'keys.json');

writeFileSync(responderPubPath, Buffer.from(responderKeys.publicKey).toString('hex'));
writeFileSync(responderPrivPath, Buffer.from(responderKeys.privateKey).toString('hex'));
writeFileSync(signingPubPath, Buffer.from(signingKeys.publicKey).toString('hex'));
writeFileSync(signingPrivPath, Buffer.from(signingKeys.privateKey).toString('hex'));

// Save as JSON for easy access
const keysData = {
  responder: {
    publicKey: Buffer.from(responderKeys.publicKey).toString('hex'),
    privateKey: Buffer.from(responderKeys.privateKey).toString('hex'),
    version: responderKeys.version,
    expiresAt: responderKeys.expiresAt,
  },
  signing: {
    publicKey: Buffer.from(signingKeys.publicKey).toString('hex'),
    privateKey: Buffer.from(signingKeys.privateKey).toString('hex'),
    version: signingKeys.version,
  },
};
writeFileSync(keysJsonPath, JSON.stringify(keysData, null, 2));

console.log('✅ Keys saved to:', outputDir);
console.log('   - RESPONDER_PUBLIC_KEY.hex (put in .env)');
console.log('   - RESPONDER_PRIVATE_KEY.hex (keep secure)');
console.log('   - SIGNING_PUBLIC_KEY.hex (embed in responder page)');
console.log('   - SIGNING_PRIVATE_KEY.hex (keep secure)');
console.log('   - keys.json (backup)');

// Update .env if it exists
const envPath = join(outputDir, '../.env.local');
try {
  const fs = await import('fs');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const newEnvContent = envContent
    .replace(/RESPONDER_PUBLIC_KEY=.*/g, `RESPONDER_PUBLIC_KEY=${Buffer.from(responderKeys.publicKey).toString('hex')}`)
    .replace(/SIGNING_PUBLIC_KEY=.*/g, `SIGNING_PUBLIC_KEY=${Buffer.from(signingKeys.publicKey).toString('hex')}`);
  fs.writeFileSync(envPath, newEnvContent);
  console.log('\n✅ Updated .env.local with public keys');
} catch {
  console.log('\n⚠️  Could not update .env.local');
}
