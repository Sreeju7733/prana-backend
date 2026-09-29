/**
 * PRANA QR Binary Unpacker
 * 
 * Unpacks patient medical data from binary format.
 * Reverse of pack.ts — uses 1-byte codebook indices for compactness.
 */

import {
  CODEBOOK_VERSION,
  ALLERGENS,
  MEDICINES,
  CONDITIONS,
  CRITICAL_FLAGS,
  FREQUENCIES,
  PRESET_NOTES,
  BLOOD_GROUPS,
  GENDERS,
} from './codebook';

export interface UnpackedData {
  version: number;
  pranaId: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: Array<{ allergen: string; severity: string }>;
  criticalFlags: string[];
  medicines: Array<{ name: string; dose: string; frequency: string }>;
  conditions: Array<{ code: string; name: string }>;
  notes: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
  lastHospitalVisit?: { hospital: string; date: string };
  truncated: boolean;
}

const SEVERITY_NAMES = ['mild', 'moderate', 'severe', 'life_threatening'];
const GENDER_NAMES = ['Male', 'Female', 'Other'];
const STATUS_NAMES = ['active', 'resolved', 'chronic'];

export function unpack(bytes: Uint8Array): UnpackedData {
  let offset = 0;

  function readByte(): number | null {
    if (offset >= bytes.length) return null;
    return bytes[offset++];
  }

  function readString(maxLen: number): string {
    const len = readByte();
    if (len === null || len === 0) return '';
    const bytes = readBytes(len);
    if (!bytes) return '';
    return new TextDecoder().decode(new Uint8Array(bytes)).trim();
  }

  function readBytes(n: number): number[] | null {
    if (offset + n > bytes.length) return null;
    const result = bytes.subarray(offset, offset + n);
    offset += n;
    return Array.from(result);
  }

  // ─── Header ────────────────────────────────────────────────────────────────
  const version = readByte();
  if (version === null || version !== CODEBOOK_VERSION) {
    throw new Error(`Invalid or unsupported QR version: ${version}`);
  }

  // Prana ID — prepend PRAN- prefix, preserve full suffix
  const pranaIdSuffix = readString(16);
  const pranaId = `PRAN-${pranaIdSuffix.substring(0, 7)}`;

  // Name
  const name = readString(20);

  // Age
  const age = readByte() ?? 0;

  // Gender
  const genderIdx = readByte() ?? 0;
  const gender = GENDER_NAMES[genderIdx] ?? 'Unknown';

  // Blood Group
  const bgIdx = readByte() ?? 0;
  const bloodGroup = BLOOD_GROUPS[bgIdx] ?? 'Unknown';

  // ─── Critical Flags (2 bytes = 16 bitflags) ───────────────────────────────
  const flagByte1 = readByte() ?? 0;
  const flagByte2 = readByte() ?? 0;
  const criticalFlags: string[] = [];
  for (let i = 0; i < Math.min(16, CRITICAL_FLAGS.length); i++) {
    const byte = i < 8 ? flagByte1 : flagByte2;
    if (byte & (1 << (i % 8))) {
      criticalFlags.push(CRITICAL_FLAGS[i].id);
    }
  }

  // ─── Allergies ─────────────────────────────────────────────────────────────
  const allergyCount = readByte() ?? 0;
  const allergies: Array<{ allergen: string; severity: string }> = [];
  for (let i = 0; i < Math.min(allergyCount, 10); i++) {
    const marker = readByte() ?? 0;
    let allergen: string;
    if (marker === 255) {
      allergen = readString(15);
    } else {
      allergen = marker < ALLERGENS.length ? ALLERGENS[marker] : `Allergen #${marker}`;
    }
    const sevIdx = readByte() ?? 0;
    allergies.push({ allergen, severity: SEVERITY_NAMES[sevIdx] ?? 'unknown' });
  }

  // ─── Medicines ─────────────────────────────────────────────────────────────
  const medCount = readByte() ?? 0;
  const medicines: Array<{ name: string; dose: string; frequency: string }> = [];
  for (let i = 0; i < Math.min(medCount, 10); i++) {
    const marker = readByte() ?? 0;
    let medName: string;
    if (marker === 255) {
      medName = readString(15);
    } else {
      medName = marker < MEDICINES.length ? MEDICINES[marker] : `Medicine #${marker}`;
    }
    const dose = readString(8);
    const freqIdx = readByte() ?? 0;
    const frequency = freqIdx < FREQUENCIES.length ? FREQUENCIES[freqIdx] : 'OD';
    medicines.push({ name: medName, dose, frequency });
  }

  // ─── Conditions ────────────────────────────────────────────────────────────
  const condCount = readByte() ?? 0;
  const conditions: Array<{ code: string; name: string }> = [];
  for (let i = 0; i < Math.min(condCount, 8); i++) {
    const marker = readByte() ?? 0;
    let code: string;
    if (marker === 255) {
      code = readString(8);
    } else {
      const cond = marker < CONDITIONS.length ? CONDITIONS[marker] : null;
      code = cond?.code ?? `CODE${marker}`;
    }
    const cond = CONDITIONS.find(c => c.code === code);
    conditions.push({ code, name: cond?.name ?? code });
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────
  const noteCount = readByte() ?? 0;
  const notes: string[] = [];
  for (let i = 0; i < Math.min(noteCount, 5); i++) {
    const marker = readByte() ?? 0;
    if (marker === 255) {
      const note = readString(20);
      if (note) notes.push(note);
    } else if (marker < PRESET_NOTES.length) {
      notes.push(PRESET_NOTES[marker]);
    }
  }

  // ─── Emergency Contact ─────────────────────────────────────────────────────
  let emergencyContact: { name: string; phone: string; relationship: string } | undefined;
  const hasContact = readByte();
  if (hasContact === 1) {
    const cname = readString(15);
    const phone = readString(12);
    if (cname || phone) {
      emergencyContact = { name: cname, phone, relationship: 'Emergency' };
    }
  }

  // ─── Last Hospital Visit ──────────────────────────────────────────────────
  let lastHospitalVisit: { hospital: string; date: string } | undefined;
  const hasVisit = readByte();
  if (hasVisit === 1) {
    const hospital = readString(15);
    const date = readString(10);
    if (hospital || date) {
      lastHospitalVisit = { hospital, date };
    }
  }

  const truncated = offset >= bytes.length;

  return {
    version: version ?? CODEBOOK_VERSION,
    pranaId,
    name,
    age,
    gender,
    bloodGroup,
    allergies,
    criticalFlags,
    medicines,
    conditions,
    notes,
    emergencyContact,
    lastHospitalVisit,
    truncated,
  };
}
