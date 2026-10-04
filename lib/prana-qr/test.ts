#!/usr/bin/env node
/**
 * PRANA QR Round-trip Test
 */

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
console.log('  PRANA QR Codebook - Round-trip Test');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📦 PACKING...');
const packed = pack(testData);
console.log(`   Size: ${packed.size} bytes`);
console.log(`   Truncated: ${packed.truncated}`);

if (packed.size > 150) {
  console.error('   ❌ FAILED: Exceeds 150 byte limit!');
  process.exit(1);
}
console.log('   ✅ Pack successful\n');

console.log('📦 UNPACKING...');
const unpacked = unpack(packed.bytes);
console.log(`   Prana ID: ${unpacked.pranaId}`);
console.log(`   Name: ${unpacked.name}`);
console.log(`   Allergies: ${unpacked.allergies.length}`);
console.log(`   Medicines: ${unpacked.medicines.length}`);
console.log(`   Conditions: ${unpacked.conditions.length}`);
console.log(`   Notes: ${unpacked.notes.length}`);
console.log(`   Flags: ${unpacked.criticalFlags.length}\n`);

console.log('🔍 VERIFYING...');
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
check('Age', 28, unpacked.age);
check('Gender', 'Male', unpacked.gender);
check('Blood Group', 'B+', unpacked.bloodGroup);
check('Allergies count', 3, unpacked.allergies.length);
check('Medicines count', 5, unpacked.medicines.length);
check('Conditions count', 4, unpacked.conditions.length);
check('Notes count', 3, unpacked.notes.length);
check('Flags count', 3, unpacked.criticalFlags.length);

if (unpacked.allergies[0]?.allergen === 'Penicillin') { console.log('   ✅ Allergy: Penicillin'); passed++; }
else { console.log('   ❌ Allergy mismatch'); failed++; }
if (unpacked.medicines[0]?.name === 'Metformin') { console.log('   ✅ Medicine: Metformin'); passed++; }
else { console.log('   ❌ Medicine mismatch'); failed++; }
if (unpacked.conditions[0]?.code === 'E11') { console.log('   ✅ Condition: E11'); passed++; }
else { console.log('   ❌ Condition mismatch'); failed++; }
if (unpacked.notes.includes('No NSAIDs')) { console.log('   ✅ Notes: No NSAIDs'); passed++; }
else { console.log('   ❌ Notes mismatch'); failed++; }

console.log('\n📊 HEX DUMP:');
const hex = Array.from(packed.bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log(`   ${hex}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log(`   Passed: ${passed}  Failed: ${failed}`);
console.log(`   Size: ${packed.size}/150 bytes (${Math.round(packed.size/150*100)}%)`);
console.log(failed === 0 && packed.size <= 150 ? '\n   🎉 ALL TESTS PASSED!\n' : '\n   ❌ SOME TESTS FAILED\n');
process.exit(failed === 0 ? 0 : 1);
