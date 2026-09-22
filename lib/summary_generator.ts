import { supabase } from '@/lib/auth';

export interface SummaryBullet {
    text: string;
    is_critical: boolean;
}

export interface SummaryResult {
    title: string;
    badge: string;
    generated_at: string;
    bullets: SummaryBullet[];
    overflow_count: number;
    has_records: boolean;
}

// Case 10: Allergen string normalization helper
function normalizeAllergenName(rawName: string): string {
    return rawName.trim().replace(/\s+/g, ' ');
}

export async function generateEmergencySummary(userId: string): Promise<SummaryResult> {
    try {
        const [
            { data: rawAllergies },
            { data: rawMeds },
            { data: rawConditions },
            { data: contacts }
        ] = await Promise.all([
            supabase.from('allergies').select('*').eq('user_id', userId),
            // Case 7: Only fetch active medications (is_active = true)
            supabase.from('medications').select('*').eq('user_id', userId).eq('is_active', true),
            // Case 7: Only fetch active conditions (status = active)
            supabase.from('conditions').select('*').eq('user_id', userId).eq('status', 'active'),
            supabase.from('emergency_contacts').select('name, is_verified').eq('user_id', userId).limit(1)
        ]);

        // Case 10: Deduplicate and normalize allergies (case-insensitive deduplication)
        interface AllergyRecord {
            allergen?: string;
            name?: string;
            severity?: string;
            is_critical?: boolean;
            [key: string]: unknown;
        }
        const allergyMap = new Map<string, AllergyRecord>();
        if (rawAllergies) {
            for (const a of rawAllergies) {
                const rawName = String(a.allergen || a.name || '').trim();
                const norm = normalizeAllergenName(rawName).toLowerCase();
                if (norm && norm !== 'null' && norm !== 'undefined') {
                    if (!allergyMap.has(norm)) {
                        allergyMap.set(norm, { ...a, allergen: normalizeAllergenName(rawName) });
                    } else {
                        // Keep highest severity if duplicate
                        if (a.is_critical || String(a.severity).toLowerCase() === 'severe') {
                            allergyMap.set(norm, { ...a, allergen: normalizeAllergenName(rawName) });
                        }
                    }
                }
            }
        }
        const allAllergies = Array.from(allergyMap.values());
        const allMeds = rawMeds || [];
        const allConditions = rawConditions || [];
        const contact = (contacts && contacts.length > 0) ? contacts[0] : null;

        // Case 1: Zero data at all (fresh account) -> has_records = false
        const totalRecords = allAllergies.length + allMeds.length + allConditions.length;
        if (totalRecords === 0) {
            return {
                title: 'Emergency Summary',
                badge: 'Auto-updated',
                generated_at: new Date().toISOString(),
                bullets: [],
                overflow_count: 0,
                has_records: false
            };
        }

        const criticalBullets: SummaryBullet[] = [];
        const neutralBullets: SummaryBullet[] = [];

        // Case 3 & 4: Separate severe/critical allergies from moderate/mild ones
        for (const a of allAllergies) {
            const isCrit = a.is_critical === true || String(a.severity || '').toLowerCase() === 'severe';
            if (isCrit) {
                // Case 1: Severe / Critical Allergy
                criticalBullets.push({
                    text: `Severe ${a.allergen} Allergy — Anaphylaxis Risk`,
                    is_critical: true
                });
            } else {
                // Case 3: Moderate / Mild Allergy (Neutral bullet style)
                neutralBullets.push({
                    text: `${a.allergen} Allergy (${a.severity || 'moderate'})`,
                    is_critical: false
                });
            }
        }

        // Case 2: Only allergies, no active conditions or meds
        if (allMeds.length === 0 && allConditions.length === 0) {
            neutralBullets.push({
                text: 'No active medications or conditions on file.',
                is_critical: false
            });
        } else {
            // Case 6: Active conditions paired with treating medication (falls back to condition alone if med deleted)
            const pairedMedIds = new Set<string>();
            for (const cond of allConditions) {
                const matchingMed = allMeds.find(m =>
                    m.reason_for_taking &&
                    m.reason_for_taking.toLowerCase().includes(cond.name.toLowerCase())
                );
                if (matchingMed) {
                    pairedMedIds.add(matchingMed.id);
                    const medDetails = [matchingMed.name, matchingMed.dose, matchingMed.frequency].filter(Boolean).join(' ');
                    neutralBullets.push({
                        text: `${cond.name} (${medDetails})`,
                        is_critical: false
                    });
                } else {
                    neutralBullets.push({
                        text: cond.name,
                        is_critical: false
                    });
                }
            }

            // Unpaired Medications
            for (const med of allMeds) {
                if (!pairedMedIds.has(med.id)) {
                    const medDetails = [med.name, med.dose, med.frequency].filter(Boolean).join(' ');
                    neutralBullets.push({
                        text: medDetails,
                        is_critical: false
                    });
                }
            }
        }

        // Emergency Contact status line
        if (contact && contact.name) {
            const verifiedStr = contact.is_verified ? 'Verified' : 'Active';
            neutralBullets.push({
                text: `Emergency Relay: ${contact.name} (${verifiedStr})`,
                is_critical: false
            });
        }

        // Case 4: ALL critical allergies MUST render in full (never truncated)
        // Case 5: Cap visible neutral/non-critical lines at 3 items max
        const maxNeutralVisible = 3;
        const visibleNeutral = neutralBullets.slice(0, maxNeutralVisible);
        const overflowCount = Math.max(0, neutralBullets.length - maxNeutralVisible);

        const finalBullets = [...criticalBullets, ...visibleNeutral];

        return {
            title: 'Emergency Summary',
            badge: 'Auto-updated',
            generated_at: new Date().toISOString(),
            bullets: finalBullets,
            overflow_count: overflowCount,
            has_records: true
        };
    } catch {
        return {
            title: 'Emergency Summary',
            badge: 'Auto-updated',
            generated_at: new Date().toISOString(),
            bullets: [],
            overflow_count: 0,
            has_records: false
        };
    }
}
