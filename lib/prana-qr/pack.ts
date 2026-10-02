/**
 * PRANA QR Binary Packer - Efficient variable-length format
 * 
 * Uses 1-byte length prefixes for strings and codebook indices for lookups.
 * Highly compact: typically 80-120 bytes for a full medical profile.
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
  getAllergenIndex,
  getMedicineIndex,
  getConditionIndex,
  getFrequencyIndex,
  getNoteIndex,
  getFlagIndex,
} from './codebook';

export interface PackedData {
  bytes: Uint8Array;
  size: number;
  truncated: boolean;
  truncatedItems?: string[];
}

export interface PatientData {
  pranaId: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: Array<{ allergen: string; severity: string }>;
  criticalFlags: string[];
  medicines: Array<{ name: string; dose: string; frequency: string; reason?: string }>;
  conditions: Array<{ code: string; name: string; status?: string }>;
  notes: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
  lastHospitalVisit?: { hospital: string; date: string; diagnosis?: string };
}

const MAX_SIZE = 150;
const SEVERITY_MAP: Record<string, number> = { 'mild': 0, 'moderate': 1, 'severe': 2, 'life_threatening': 3 };

export function pack(data: PatientData): PackedData {
  const buffer: number[] = [];
  const truncatedItems: string[] = [];

  function addByte(b: number): boolean {
    if (buffer.length >= MAX_SIZE) return false;
    buffer.push(b & 0xFF);
    return true;
  }

  function addBytes(arr: number[]): boolean {
    for (const b of arr) {
      if (!addByte(b)) return false;
    }
    return true;
  }

  function addString(str: string, maxLen: number): boolean {
    const encoded = new TextEncoder().encode(str.substring(0, maxLen));
    if (!addByte(encoded.length)) return false;
    return addBytes(Array.from(encoded));
  }

  // ─── Header ────────────────────────────────────────────────────────────────
  if (!addByte(CODEBOOK_VERSION)) return overflow();

  // Prana ID (trim PRAN- prefix to save 5 bytes)
  const pranaId = data.pranaId.replace(/^PRAN-/, '');
  if (!addString(pranaId, 16)) return overflow();

  // Name (first name or full name, max 20 chars)
  if (!addString(data.name, 20)) return overflow();

  // Age (1 byte)
  if (!addByte(Math.min(data.age, 150))) return overflow();

  // Gender (0=Male, 1=Female, 2=Other)
  const gIdx = GENDERS.indexOf(data.gender);
  if (!addByte(gIdx >= 0 ? gIdx : 0)) return overflow();

  // Blood Group (0-7)
  const bgIdx = BLOOD_GROUPS.indexOf(data.bloodGroup);
  if (!addByte(bgIdx >= 0 ? bgIdx : 0)) return overflow();

  // ─── Critical Flags (2 bytes = 16 bitflags) ───────────────────────────────
  const flagBytes = new Uint8Array(2);
  for (const flagId of data.criticalFlags) {
    const idx = getFlagIndex(flagId);
    if (idx !== null && idx >= 0 && idx < 16) {
      flagBytes[Math.floor(idx / 8)] |= (1 << (idx % 8));
    }
  }
  if (!addBytes(Array.from(flagBytes))) return overflow();

  // ─── Allergies (Priority 1) ───────────────────────────────────────────────
  const allergyCount = Math.min(data.allergies.length, 10);
  if (!addByte(allergyCount)) return overflow();

  for (let i = 0; i < allergyCount; i++) {
    const item = data.allergies[i];
    const idx = getAllergenIndex(item.allergen);
    const sev = SEVERITY_MAP[item.severity.toLowerCase()] ?? 0;

    if (idx !== null && idx >= 0) {
      // 1 byte marker (< 250) + 1 byte severity
      if (!addByte(idx)) return overflow();
      if (!addByte(sev)) return overflow();
    } else {
      // 255 = free-text marker
      if (!addByte(255)) return overflow();
      if (!addString(item.allergen, 15)) return overflow();
      if (!addByte(sev)) return overflow();
    }
  }

  // ─── Medicines (Priority 2) ───────────────────────────────────────────────
  const medCount = Math.min(data.medicines.length, 10);
  if (!addByte(medCount)) return overflow();

  for (let i = 0; i < medCount; i++) {
    const med = data.medicines[i];
    const idx = getMedicineIndex(med.name);
    const freqIdx = getFrequencyIndex(med.frequency);

    if (idx !== null && idx >= 0) {
      if (!addByte(idx)) return overflow();
    } else {
      if (!addByte(255)) return overflow();
      if (!addString(med.name, 15)) return overflow();
    }

    // Dose (compact string, max 8 chars, e.g. "500mg")
    if (!addString(med.dose, 8)) return overflow();

    // Frequency (1 byte: 0-13)
    if (!addByte(freqIdx !== null && freqIdx >= 0 ? freqIdx : 0)) return overflow();
  }

  // ─── Conditions (Priority 3) ──────────────────────────────────────────────
  const condCount = Math.min(data.conditions.length, 8);
  if (!addByte(condCount)) return overflow();

  for (let i = 0; i < condCount; i++) {
    const cond = data.conditions[i];
    const idx = getConditionIndex(cond.code);

    if (idx !== null && idx >= 0) {
      if (!addByte(idx)) return overflow();
    } else {
      if (!addByte(255)) return overflow();
      if (!addString(cond.code, 8)) return overflow();
    }
  }

  // ─── Notes (Priority 4) ───────────────────────────────────────────────────
  const noteCount = Math.min(data.notes.length, 5);
  if (!addByte(noteCount)) return overflow();

  for (let i = 0; i < noteCount; i++) {
    const note = data.notes[i];
    const idx = getNoteIndex(note);

    if (idx !== null && idx >= 0) {
      if (!addByte(idx)) return overflow();
    } else {
      if (!addByte(255)) return overflow();
      if (!addString(note, 20)) return overflow();
    }
  }

  // ─── Emergency Contact (Priority 5) ───────────────────────────────────────
  if (data.emergencyContact) {
    if (!addByte(1)) return overflow();
    if (!addString(data.emergencyContact.name, 15)) return overflow();
    if (!addString(data.emergencyContact.phone, 12)) return overflow();
  } else {
    if (!addByte(0)) return overflow();
  }

  // ─── Last Visit (Priority 6) ──────────────────────────────────────────────
  if (data.lastHospitalVisit) {
    if (!addByte(1)) return overflow();
    if (!addString(data.lastHospitalVisit.hospital, 15)) return overflow();
    if (!addString(data.lastHospitalVisit.date.substring(0, 10), 10)) return overflow();
  } else {
    if (!addByte(0)) return overflow();
  }

  function overflow(): PackedData {
    return {
      bytes: new Uint8Array(buffer),
      size: buffer.length,
      truncated: true,
      truncatedItems: ['Data truncated to fit 150-byte limit'],
    };
  }

  const result = new Uint8Array(buffer);
  return {
    bytes: result,
    size: result.length,
    truncated: false,
  };
}
