#!/usr/bin/env node
/**
 * PRANA QR Encryption Test
 */

import { 
  generateResponderKeys, 
  generateSigningKeys,
  encrypt, 
  decrypt,
  sign, 
  verify,
  buildQr,
  qrToBase45,
  type QrHeader 
} from './encrypt';
import { pack, type PatientData } from './pack';
import { unpack } from './unpack';

const testData: PatientData = {
  pranaId: 'PRAN-2973CAC',
  name: 'Sreeju',
  age: 28,
  gender: 'Male',
  bloodGroup: 'B+',
  allergies: [
    { allergen: 'Penicillin', severity: 'Severe' },
    { allergen: 'Peanuts', severity: 'Severe' },
    { allergen: 'Latex', severity: 'Moderate' },
  ],
  criticalFlags: ['thin_blood', 'epilepsy', 'diabetic'],
  medicines: [
    { name: 'Metformin', dose: '500mg', frequency: 'BD' },
    { name: 'Amlodipine', dose: '5mg', frequency: 'OD' },
    { name: 'Aspirin', dose: '75mg', frequency: 'OD' },
    { name: 'Atorvastatin', dose: '10mg', frequency: 'HS' },
    { name: 'Omeprazole', dose: '20mg', frequency: 'OD' },
  ],
  conditions: [
    { code: 'E11', name: 'Type 2 Diabetes Mellitus', status: 'active' },
    { code: 'I10', name: 'Essential Hypertension', status: 'active' },
    { code: 'E78', name: 'Hyperlipidemia', status: 'active' },
    { code: 'K21', name: 'GERD', status: 'resolved' },
  ],
  notes: ['No NSAIDs', 'Check glucose first', 'Monitor BP'],
  emergencyContact: { name: 'Priya S', phone: '9876543210', relationship: 'Sister' },
  lastHospitalVisit: { hospital: 'Apollo Hospital', date: '2024-08-15' },
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  PRANA QR Encryption Test');
console.log('═══════════════════════════════════════════════════════════\n');

// Generate keys
const responderKeys = generateResponderKeys(1, 365);
const signingKeys = generateSigningKeys(1);

console.log('🔑 Keys Generated');
console.log(`   Responder Public: ${Buffer.from(responderKeys.publicKey).toString('hex').substring(0, 16)}...`);
console.log(`   Signing Public:   ${Buffer.from(signingKeys.publicKey).toString('hex').substring(0, 16)}...\n`);

// Build header
const header: QrHeader = {
  version: 1,
  age: 28,
  gender: 0, // Male
  bloodGroupIdx: 2, // B+
  pranaIdSuffix: '2973CAC',
  timestamp: Math.floor(Date.now() / 1000),
};

// Build QR
console.log('📦 Building QR...');
const components = buildQr(
  testData,
  header,
  responderKeys.privateKey,
  signingKeys.privateKey,
  responderKeys.publicKey,
  signingKeys.publicKey,
);

// Convert to Base45
const qrString = qrToBase45(components);
console.log(`   QR String (Base45): ${qrString.substring(0, 50)}...`);
console.log(`   QR Length: ${qrString.length} chars\n`);

// Verify signature
console.log('🔐 Verifying Signature...');
const combined = new Uint8Array(components.header.length +
  components.encrypted.ephemeralPublicKey.length +
  components.encrypted.nonce.length +
  components.encrypted.ciphertext.length +
  components.encrypted.tag.length);
let offset = 0;
combined.set(components.header, offset); offset += components.header.length;
combined.set(components.encrypted.ephemeralPublicKey, offset); offset += components.encrypted.ephemeralPublicKey.length;
combined.set(components.encrypted.nonce, offset); offset += components.encrypted.nonce.length;
combined.set(components.encrypted.ciphertext, offset); offset += components.encrypted.ciphertext.length;
combined.set(components.encrypted.tag, offset);

const sigValid = verify(combined, components.signature, signingKeys.publicKey);
console.log(`   Signature Valid: ${sigValid ? '✅ YES' : '❌ NO'}\n`);

// Decrypt
console.log('🔓 Decrypting...');
const decrypted = decrypt(components.encrypted, responderKeys.privateKey);
if (!decrypted) {
  console.log('   ❌ Decryption failed!\n');
  process.exit(1);
}
console.log(`   Decrypted Size: ${decrypted.length} bytes\n`);

// Unpack
console.log('📦 Unpacking...');
const unpacked = unpack(decrypted as unknown as Uint8Array);
console.log(`   Prana ID: ${unpacked.pranaId}`);
console.log(`   Name: ${unpacked.name}`);
console.log(`   Allergies: ${unpacked.allergies.length}`);
console.log(`   Medicines: ${unpacked.medicines.length}`);
console.log(`   Conditions: ${unpacked.conditions.length}`);
console.log(`   Notes: ${unpacked.notes.length}\n`);

// Verify data integrity
console.log('🔍 Verifying Data Integrity...');
let passed = 0, failed = 0;
function check(label: string, expected: unknown, actual: unknown) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    console.log(`   ✅ ${label}`); passed++;
  } else {
    console.log(`   ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); failed++;
  }
}

check('Prana ID', 'PRAN-2973CAC', unpacked.pranaId);
check('Name', 'Sreeju', unpacked.name);
check('Allergies count', 3, unpacked.allergies.length);
check('Medicines count', 5, unpacked.medicines.length);
check('Conditions count', 4, unpacked.conditions.length);
check('Notes count', 3, unpacked.notes.length);

if (unpacked.allergies[0]?.allergen === 'Penicillin') { console.log('   ✅ Allergy: Penicillin'); passed++; }
else { console.log('   ❌ Allergy mismatch'); failed++; }
if (unpacked.medicines[0]?.name === 'Metformin') { console.log('   ✅ Medicine: Metformin'); passed++; }
else { console.log('   ❌ Medicine mismatch'); failed++; }
if (unpacked.conditions[0]?.code === 'E11') { console.log('   ✅ Condition: E11'); passed++; }
else { console.log('   ❌ Condition mismatch'); failed++; }
if (unpacked.notes.includes('No NSAIDs')) { console.log('   ✅ Notes: No NSAIDs'); passed++; }
else { console.log('   ❌ Notes mismatch'); failed++; }

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   QR Size: ${qrString.length} Base45 chars`);
console.log(sigValid && failed === 0 ? '\n   🎉 ALL TESTS PASSED!\n' : '\n   ❌ SOME TESTS FAILED\n');
process.exit(sigValid && failed === 0 ? 0 : 1);
