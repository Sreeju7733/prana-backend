-- Migration: 001_initial_schema.sql
-- Description: Complete Prana Database Schema with Extensions, Tables, Indexes, RLS Policies, Triggers, Functions, and Views.

-- ==========================================
-- 1. Enable Required Extensions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Note: Vault extension is optional depending on environment/plan. Uncomment if using Supabase Vault:
-- CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ==========================================
-- 2. Database Schema
-- ==========================================

-- 2.1 Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT UNIQUE NOT NULL,
    full_name TEXT,
    prana_id TEXT UNIQUE NOT NULL DEFAULT 'PRAN-' || substr(md5(random()::text), 1, 8),
    date_of_birth DATE,
    blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
    gender TEXT CHECK (gender IN ('M', 'F', 'Other', 'Unknown')),
    weight_kg INTEGER,
    height_cm INTEGER,
    emergency_relay_number TEXT DEFAULT '1800-PRANA-RELAY-' || substr(md5(random()::text), 1, 4),
    encrypted_pii TEXT, -- JSON blob encrypted via pgcrypto
    card_status TEXT DEFAULT 'active' CHECK (card_status IN ('active', 'suspended', 'deactivated')),
    daily_scan_limit INTEGER DEFAULT 10,
    allowed_countries TEXT[] DEFAULT ARRAY['IN'],
    active_hours_start TIME DEFAULT '00:00',
    active_hours_end TIME DEFAULT '23:59',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_prana_id ON profiles(prana_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_card_status ON profiles(card_status);

-- 2.2 Allergies Table
CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction_description TEXT,
    date_diagnosed DATE,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_user ON allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_allergies_critical ON allergies(user_id, is_critical) WHERE is_critical = true;

-- 2.3 Medications Table
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    generic_name TEXT,
    dose TEXT NOT NULL,
    frequency TEXT NOT NULL,
    prescribed_by TEXT,
    prescribed_date DATE,
    is_active BOOLEAN DEFAULT true,
    encrypted_prescription_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(user_id, is_active) WHERE is_active = true;

-- 2.4 Conditions (Diagnoses) Table
CREATE TABLE IF NOT EXISTS conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icd10_code TEXT,
    diagnosed_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'chronic')),
    treating_doctor TEXT,
    hospital TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_user ON conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_conditions_active ON conditions(user_id, status) WHERE status = 'active';

-- 2.5 Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_hash TEXT NOT NULL,
    encrypted_phone TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    notification_channels TEXT[] DEFAULT ARRAY['push', 'sms'],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = true;

-- 2.6 Vitals / Observations Table
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vital_type TEXT NOT NULL CHECK (vital_type IN ('bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'glucose', 'spo2', 'weight')),
    value DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'health_connect', 'wearable')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recent ON vitals(user_id, vital_type, recorded_at DESC);

-- 2.7 Medical Briefings Table
CREATE TABLE IF NOT EXISTS medical_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    green_briefing TEXT,
    yellow_briefing TEXT,
    red_briefing TEXT,
    encrypted_red_briefing TEXT,
    generated_by TEXT DEFAULT 'gemini-2.5-flash',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_user ON medical_briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_expiry ON medical_briefings(expires_at);

-- 2.8 Scan Logs Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prana_id TEXT NOT NULL,
    scanned_by_ip INET,
    scanned_by_user_agent TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    access_tier TEXT CHECK (access_tier IN ('green', 'yellow', 'red')),
    responder_code TEXT,
    responder_id TEXT,
    hospital_id TEXT,
    doctor_id TEXT,
    access_granted BOOLEAN DEFAULT false,
    denial_reason TEXT,
    device_type TEXT,
    browser TEXT,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_prana ON scan_logs(prana_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_time ON scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_location ON scan_logs USING gist (point(location_lng, location_lat));

-- Immutability Trigger on scan_logs
CREATE OR REPLACE FUNCTION prevent_scan_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Scan logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scan_logs_immutable ON scan_logs;
CREATE TRIGGER scan_logs_immutable
BEFORE UPDATE OR DELETE ON scan_logs
FOR EACH ROW EXECUTE FUNCTION prevent_scan_log_modification();

-- 2.9 Verified Responders Table
CREATE TABLE IF NOT EXISTS verified_responders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responder_code TEXT UNIQUE NOT NULL,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    organization TEXT NOT NULL,
    organization_type TEXT CHECK (organization_type IN ('ambulance', 'hospital', 'police', 'fire')),
    is_active BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responders_code ON verified_responders(responder_code);
CREATE INDEX IF NOT EXISTS idx_responders_active ON verified_responders(is_active, expires_at) WHERE is_active = true;

-- 2.10 Verified Hospitals Table
CREATE TABLE IF NOT EXISTS verified_hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'IN',
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_id ON verified_hospitals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON verified_hospitals(city, state);

-- 2.11 Hospital Staff Table
CREATE TABLE IF NOT EXISTS hospital_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES verified_hospitals(id),
    doctor_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nmc_number TEXT,
    specialty TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_hospital ON hospital_staff(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_doctor ON hospital_staff(doctor_id);

-- ==========================================
-- 3. Row Level Security (RLS) Policies
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- 3.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view green data" ON profiles;
CREATE POLICY "Public can view green data" ON profiles FOR SELECT USING (card_status = 'active');

DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- 3.2 Allergies Policies
DROP POLICY IF EXISTS "Users own their allergies" ON allergies;
CREATE POLICY "Users own their allergies" ON allergies FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can see critical allergies" ON allergies;
CREATE POLICY "Public can see critical allergies" ON allergies FOR SELECT USING (
    is_critical = true AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = allergies.user_id 
        AND profiles.card_status = 'active'
    )
);

-- 3.3 Medications Policies
DROP POLICY IF EXISTS "Users own their medications" ON medications;
CREATE POLICY "Users own their medications" ON medications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can see active medications" ON medications;
CREATE POLICY "Public can see active medications" ON medications FOR SELECT USING (
    is_active = true AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = medications.user_id 
        AND profiles.card_status = 'active'
    )
);

-- 3.4 Emergency Contacts Policies
DROP POLICY IF EXISTS "Users own their emergency contacts" ON emergency_contacts;
CREATE POLICY "Users own their emergency contacts" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- 3.5 Scan Logs Policies
DROP POLICY IF EXISTS "Users can view own scan logs" ON scan_logs;
CREATE POLICY "Users can view own scan logs" ON scan_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.prana_id = scan_logs.prana_id 
        AND profiles.id = auth.uid()
    )
);

-- ==========================================
-- 4. Encryption Helper Functions
-- ==========================================
CREATE OR REPLACE FUNCTION encrypt_field(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_field(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data::bytea, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. Functions & Triggers
-- ==========================================

-- 5.1 Auto-Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allergies_updated_at ON allergies;
CREATE TRIGGER update_allergies_updated_at BEFORE UPDATE ON allergies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conditions_updated_at ON conditions;
CREATE TRIGGER update_conditions_updated_at BEFORE UPDATE ON conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.2 Log Every Scan Automatically
CREATE OR REPLACE FUNCTION log_scan()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scan_logs (
        prana_id, scanned_by_ip, access_tier, 
        access_granted, scanned_at
    ) VALUES (
        NEW.prana_id, 
        inet_client_addr(),
        NEW.access_tier,
        NEW.access_granted,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Generate Medical Briefing on Record Change
CREATE OR REPLACE FUNCTION trigger_briefing_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE medical_briefings 
    SET expires_at = NOW() 
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_briefing_on_allergy_change ON allergies;
CREATE TRIGGER update_briefing_on_allergy_change
    AFTER INSERT OR UPDATE OR DELETE ON allergies
    FOR EACH ROW EXECUTE FUNCTION trigger_briefing_update();

DROP TRIGGER IF EXISTS update_briefing_on_medication_change ON medications;
CREATE TRIGGER update_briefing_on_medication_change
    AFTER INSERT OR UPDATE OR DELETE ON medications
    FOR EACH ROW EXECUTE FUNCTION trigger_briefing_update();

-- ==========================================
-- 6. Views for Access Tiers
-- ==========================================

-- 6.1 GREEN View (Public — No Auth Needed)
CREATE OR REPLACE VIEW public_green_data AS
SELECT 
    p.prana_id,
    p.full_name,
    p.blood_group,
    p.gender,
    p.weight_kg,
    p.emergency_relay_number,
    json_agg(DISTINCT jsonb_build_object(
        'allergen', a.allergen,
        'severity', a.severity
    )) FILTER (WHERE a.is_critical = true) AS critical_allergies
FROM profiles p
LEFT JOIN allergies a ON a.user_id = p.id AND a.is_critical = true
WHERE p.card_status = 'active'
GROUP BY p.id;

-- 6.2 YELLOW View (Paramedic — Verified)
CREATE OR REPLACE VIEW paramedic_yellow_data AS
SELECT 
    p.prana_id,
    p.full_name,
    p.date_of_birth,
    p.blood_group,
    p.weight_kg,
    p.gender,
    json_agg(DISTINCT jsonb_build_object(
        'allergen', a.allergen,
        'severity', a.severity,
        'reaction', a.reaction_description
    )) AS allergies,
    json_agg(DISTINCT jsonb_build_object(
        'name', m.name,
        'dose', m.dose,
        'frequency', m.frequency
    )) FILTER (WHERE m.is_active = true) AS active_medications,
    json_agg(DISTINCT jsonb_build_object(
        'name', c.name,
        'status', c.status,
        'since', c.diagnosed_date
    )) FILTER (WHERE c.status = 'active') AS active_conditions
FROM profiles p
LEFT JOIN allergies a ON a.user_id = p.id
LEFT JOIN medications m ON m.user_id = p.id
LEFT JOIN conditions c ON c.user_id = p.id
WHERE p.card_status = 'active'
GROUP BY p.id;
