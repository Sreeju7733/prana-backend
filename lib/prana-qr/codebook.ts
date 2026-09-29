/**
 * PRANA QR Codebook - Versioned numbered lists for binary encoding
 * 
 * IMPORTANT: Never reorder or delete entries - only append at the end.
 * Old cards depend on these numbers, and the codebook has a version number.
 */

export const CODEBOOK_VERSION = 1;

// ─── Allergens (~100 common allergens) ───────────────────────────────────────
export const ALLERGENS: string[] = [
  // Penicillins & Antibiotics
  'Penicillin', 'Amoxicillin', 'Ampicillin', 'Tetracycline', 'Sulfa drugs',
  'Tetracycline', 'Erythromycin', 'Clindamycin', 'Vancomycin', 'Ciprofloxacin',
  
  // NSAIDs & Pain relievers
  'Aspirin', 'Ibuprofen', 'Naproxen', 'Diclofenac', 'Paracetamol',
  'Aceclofenac', 'Piroxicam', 'Meloxicam', 'Indomethacin', 'Ketorolac',
  
  // Common drug classes
  'ACE inhibitors', 'ARBs', 'Beta blockers', 'Calcium channel blockers',
  'Statins', 'Metformin', 'Insulin', 'Opioids', 'Benzodiazepines',
  
  // Food allergens (major 8)
  'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Shellfish',
  'Fish', 'Soy', 'Wheat',
  
  // Other common allergens
  'Latex', 'Iodine contrast', 'Sulfa', 'Aspirin', 'Codeine',
  'Morphine', 'Heparin', 'Insulin', 'Vaccines', 'Antibiotics',
  
  // Additional common allergens
  'Penicillin G', 'Penicillin V', 'Amoxicillin/Clavulanate',
  'Cefalexin', 'Cefuroxime', 'Azithromycin', 'Doxycycline',
  'Metronidazole', 'Fluconazole', 'Aciclovir',
  
  // Environmental allergens
  'Pollen', 'Dust mites', 'Mold', 'Animal dander', 'Bee venom',
  'Wasps', 'Ants', 'Cockroach',
  
  // Food additives
  'MSG', 'Sulfites', 'Tartrazine', 'Nitrates', 'Nitrites',
  
  // Additional drugs
  'Carbamazepine', 'Phenytoin', 'Valproate', 'Lithium', 'Allopurinol',
  'Colchicine', 'Hydroxychloroquine', 'Methotrexate', 'Azathioprine',
  
  // More food allergens
  'Sesame', 'Mustard', 'Celery', 'Lupin', 'Crustaceans',
  
  // Additional medications
  'Gentamicin', 'Neomycin', 'Streptomycin', 'Rifampicin',
  'Ethambutol', 'Pyrazinamide', 'Isoniazid',
  
  // Common herbal supplements
  'St John\'s Wort', 'Ginkgo', 'Garlic supplements', 'Ginseng',
];

// ─── Medicines (200+ common medicines in India) ──────────────────────────────
export const MEDICINES: string[] = [
  // Analgesics & Antipyretics
  'Paracetamol', 'Ibuprofen', 'Aspirin', 'Naproxen', 'Diclofenac',
  'Aceclofenac', 'Piroxicam', 'Meloxicam', 'Nimesulide', 'Ketorolac',
  'Tramadol', 'Codeine', 'Morphine', 'Fentanyl',
  
  // Antibiotics
  'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Ofloxacin',
  'Levofloxacin', 'Cefixime', 'Cefuroxime', 'Cefpodoxime',
  'Ceftriaxone', 'Ceftazidime', 'Amikacin', 'Gentamicin',
  'Vancomycin', 'Linezolid', 'Metronidazole', 'Doxycycline',
  'Clarithromycin', 'Rifaximin', 'Nitrofurantoin', 'Fosfomycin',
  
  // Antihypertensives
  'Amlodipine', 'Nifedipine', 'Lisinopril', 'Enalapril',
  'Losartan', 'Telmisartan', 'Atenolol', 'Metoprolol',
  'Carvedilol', 'Propranolol', 'Hydrochlorothiazide', 'Chlorthalidone',
  
  // Diabetes medications
  'Metformin', 'Glimepiride', 'Gliclazide', 'Glipizide',
  'Insulin (Regular)', 'Insulin (NPH)', 'Insulin (Lantus)',
  'Insulin (Novorapid)', 'Insulin (Humalog)', 'Empagliflozin',
  'Dapagliflozin', 'Sitagliptin', 'Vildagliptin', 'Pioglitazone',
  
  // Statins & Lipid-lowering
  'Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin',
  'Fenofibrate', 'Gemfibrozil', 'Ezetimibe',
  
  // Antiplatelets & Anticoagulants
  'Aspirin (antiplatelet)', 'Clopidogrel', 'Ticagrelor',
  'Warfarin', 'Rivaroxaban', 'Apixaban', 'Dabigatran', 'Heparin',
  'Enoxaparin',
  
  // Respiratory
  'Salbutamol', 'Budesonide', 'Formoterol', 'Salmeterol',
  'Montelukast', 'Theophylline', 'Ipratropium',
  
  // GI medications
  'Omeprazole', 'Pantoprazole', 'Rabeprazole', 'Esomeprazole',
  'Ranitidine', 'Famotidine', 'Metoclopramide', 'Ondansetron',
  'Loperamide', 'Mesalamine',
  
  // Psychiatric
  'Sertraline', 'Fluoxetine', 'Escitalopram', 'Venlafaxine',
  'Duloxetine', 'Amitriptyline', 'Clonazepam', 'Alprazolam',
  'Lorazepam', 'Risperidone', 'Aripiprazole', 'Olanzapine',
  
  // Cardiac
  'Digoxin', 'Amiodarone', 'Furosemide', 'Spironolactone',
  'Isosorbide mononitrate', 'Nitroglycerin',
  
  // Endocrine
  'Levothyroxine', 'Methimazole', 'Propylthiouracil',
  
  // Rheumatology
  'Hydroxychloroquine', 'Methotrexate', 'Sulfasalazine',
  'Azathioprine', 'Cyclosporine', 'Tacrolimus',
  
  // Additional common medicines
  'Pantoprazole', 'Rabeprazole', 'Esomeprazole', 'Lansoprazole',
  'Domperidone', 'Pantoprazole + Domperidone',
  'Cetirizine', 'Loratadine', 'Fexofenadine', 'Levocetirizine',
  'Montelukast + Levocetirizine',
  
  // Eye/Ear/Nose
  'Ofloxacin eye drops', 'Tobramycin eye drops', 'Loteprednol',
  'Xylometazoline', 'Fluticasone nasal',
  
  // Vitamins & Supplements
  'Vitamin D3', 'Vitamin B12', 'Folic acid', 'Iron',
  'Calcium + Vitamin D', 'Multivitamin',
  
  // Emergency medications
  'Adrenaline (Epinephrine)', 'Dexamethasone', 'Methylprednisolone',
  'Hydrocortisone', 'Diphenhydramine',
  
  // Pain management
  'Pregabalin', 'Gabapentin', 'Duloxetine (pain)',
  
  // More antibiotics
  'Amoxicillin + Clavulanate', 'Cefixime', 'Cefdinir',
  'Ceftibuten', 'Cefpodoxime', 'Moxifloxacin', 'Gemifloxacin',
  
  // Anti-diarrheal
  'ORS', 'Racecadotril', 'Loperamide + ORS',
];

// ─── Conditions (ICD-10 codes) ───────────────────────────────────────────────
export const CONDITIONS: { code: string; name: string }[] = [
  { code: 'E11', name: 'Type 2 Diabetes Mellitus' },
  { code: 'E10', name: 'Type 1 Diabetes Mellitus' },
  { code: 'I10', name: 'Essential Hypertension' },
  { code: 'I20', name: 'Angina Pectoris' },
  { code: 'I21', name: 'Acute Myocardial Infarction' },
  { code: 'I50', name: 'Heart Failure' },
  { code: 'J45', name: 'Asthma' },
  { code: 'J44', name: 'COPD' },
  { code: 'E78', name: 'Hyperlipidemia' },
  { code: 'E66', name: 'Obesity' },
  { code: 'K21', name: 'GERD' },
  { code: 'K29', name: 'Gastritis' },
  { code: 'K80', name: 'Gallstones' },
  { code: 'N18', name: 'Chronic Kidney Disease' },
  { code: 'N17', name: 'Acute Kidney Injury' },
  { code: 'G43', name: 'Migraine' },
  { code: 'G40', name: 'Epilepsy' },
  { code: 'F32', name: 'Major Depressive Disorder' },
  { code: 'F41', name: 'Anxiety Disorder' },
  { code: 'F20', name: 'Schizophrenia' },
  { code: 'C34', name: 'Lung Cancer' },
  { code: 'C50', name: 'Breast Cancer' },
  { code: 'C18', name: 'Colorectal Cancer' },
  { code: 'C61', name: 'Prostate Cancer' },
  { code: 'D64', name: 'Anemia' },
  { code: 'D50', name: 'Iron Deficiency Anemia' },
  { code: 'B12', name: 'HIV Infection' },
  { code: 'A15', name: 'Tuberculosis' },
  { code: 'M81', name: 'Osteoporosis' },
  { code: 'M17', name: 'Osteoarthritis' },
  { code: 'M06', name: 'Rheumatoid Arthritis' },
  { code: 'L20', name: 'Atopic Dermatitis' },
  { code: 'L40', name: 'Psoriasis' },
  { code: 'H10', name: 'Conjunctivitis' },
  { code: 'H25', name: 'Cataract' },
  { code: 'H40', name: 'Glaucoma' },
  { code: 'H90', name: 'Hearing Loss' },
  { code: 'G47', name: 'Sleep Apnea' },
  { code: 'R50', name: 'Fever' },
  { code: 'R10', name: 'Abdominal Pain' },
  { code: 'R07', name: 'Chest Pain' },
  { code: 'R06', name: 'Dyspnea' },
  { code: 'R55', name: 'Syncope' },
  { code: 'R41', name: 'Confusion' },
  { code: 'R56', name: 'Seizure' },
  { code: 'R20', name: 'Paresthesia' },
  { code: 'M54', name: 'Back Pain' },
  { code: 'M51', name: 'Herniated Disc' },
  { code: 'S82', name: 'Knee Injury' },
  { code: 'S72', name: 'Hip Fracture' },
  { code: 'S62', name: 'Hand Fracture' },
  { code: 'S92', name: 'Ankle Fracture' },
  { code: 'T14', name: 'Unspecified Injury' },
];

// ─── Critical Flags (bits) ───────────────────────────────────────────────────
export interface CriticalFlag {
  id: string;
  name: string;
  description: string;
}

export const CRITICAL_FLAGS: CriticalFlag[] = [
  { id: 'thin_blood', name: 'On Blood Thinners', description: 'Taking anticoagulants' },
  { id: 'pacemaker', name: 'Pacemaker/ICD', description: 'Has cardiac implantable device' },
  { id: 'epilepsy', name: 'Epilepsy', description: 'History of seizures' },
  { id: 'diabetic', name: 'Diabetic', description: 'Has diabetes mellitus' },
  { id: 'pregnant', name: 'Pregnant', description: 'Currently pregnant' },
  { id: 'organ_transplant', name: 'Organ Transplant', description: 'History of organ transplantation' },
  { id: 'hiv_positive', name: 'HIV Positive', description: 'HIV positive status' },
  { id: 'hepatitis_b', name: 'Hepatitis B', description: 'Hepatitis B carrier' },
  { id: 'hepatitis_c', name: 'Hepatitis C', description: 'Hepatitis C carrier' },
  { id: 'tuberculosis', name: 'Tuberculosis', description: 'Active or history of TB' },
  { id: 'dialysis', name: 'On Dialysis', description: 'Chronic dialysis dependent' },
  { id: 'asthma_severe', name: 'Severe Asthma', description: 'Severe or hard-to-treat asthma' },
  { id: 'heart_failure', name: 'Heart Failure', description: 'History of heart failure' },
  { id: 'stroke', name: 'Stroke History', description: 'History of stroke/TIA' },
  { id: 'allergy_penicillin', name: 'Penicillin Allergy', description: 'Allergic to penicillin' },
  { id: 'allergy_sulfa', name: 'Sulfa Allergy', description: 'Allergic to sulfa drugs' },
  { id: 'allergy_latex', name: 'Latex Allergy', description: 'Allergic to latex' },
  { id: 'bleeding_disorder', name: 'Bleeding Disorder', description: 'Hemophilia or other bleeding disorder' },
  { id: 'thyroid', name: 'Thyroid Disorder', description: 'Thyroid condition' },
  { id: 'cancer', name: 'Active Cancer', description: 'Active cancer or in treatment' },
];

// ─── Frequency Codes ──────────────────────────────────────────────────────────
export const FREQUENCIES: string[] = [
  'OD',    // Once daily
  'BD',    // Twice daily
  'TDS',   // Three times daily
  'QDS',   // Four times daily
  'QID',   // Four times daily (Latin)
  'STAT',  // Immediately
  'SOS',   // As needed
  'HS',    // At bedtime
  'Q4H',   // Every 4 hours
  'Q6H',   // Every 6 hours
  'Q8H',   // Every 8 hours
  'Q12H',  // Every 12 hours
  'WK',    // Weekly
  'MONTHLY', // Monthly
];

// ─── Preset Notes ─────────────────────────────────────────────────────────────
export const PRESET_NOTES: string[] = [
  'No NSAIDs',
  'Check glucose first',
  'Monitor BP',
  'Keep NPO after midnight',
  'Check kidney function',
  'Avoid alcohol',
  'Take with food',
  'Take on empty stomach',
  'Sun protection recommended',
  'Regular exercise advised',
  'Low salt diet',
  'Low fat diet',
  'Diabetic diet',
  'Renal diet',
  'Fluid restriction',
  'Protein restricted',
  'Warfarin monitoring required',
  'Regular INR check',
  'Avoid driving if dizzy',
  'Report any bleeding',
];

// ─── Hospital Types ───────────────────────────────────────────────────────────
export const HOSPITAL_TYPES: string[] = [
  'Government Hospital',
  'Private Hospital',
  'Corporate Hospital',
  'Community Health Center',
  'Primary Health Center',
  'District Hospital',
  'Medical College',
  'Mission Hospital',
];

// ─── Blood Groups ─────────────────────────────────────────────────────────────
export const BLOOD_GROUPS: string[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
];

// ─── Gender ───────────────────────────────────────────────────────────────────
export const GENDERS: string[] = ['Male', 'Female', 'Other'];

// ─── Getters ──────────────────────────────────────────────────────────────────
export function getAllergenIndex(name: string): number | null {
  const lower = name.toLowerCase().trim();
  return ALLERGENS.findIndex(a => a.toLowerCase() === lower);
}

export function getMedicineIndex(name: string): number | null {
  const lower = name.toLowerCase().trim();
  return MEDICINES.findIndex(m => m.toLowerCase() === lower);
}

export function getConditionIndex(code: string): number | null {
  return CONDITIONS.findIndex(c => c.code.toLowerCase() === code.toLowerCase());
}

export function getFrequencyIndex(freq: string): number | null {
  const lower = freq.toUpperCase().trim();
  return FREQUENCIES.findIndex(f => f === lower);
}

export function getNoteIndex(note: string): number | null {
  const lower = note.toLowerCase().trim();
  return PRESET_NOTES.findIndex(n => n.toLowerCase() === lower);
}

export function getFlagIndex(flagId: string): number | null {
  return CRITICAL_FLAGS.findIndex(f => f.id === flagId);
}
