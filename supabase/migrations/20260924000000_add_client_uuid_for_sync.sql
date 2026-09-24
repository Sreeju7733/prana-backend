-- Add client_uuid columns for offline-first sync
-- These allow the mobile app to upsert records using phone-generated UUIDs

ALTER TABLE medications ADD COLUMN IF NOT EXISTS client_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_medications_client_uuid ON medications(client_uuid) WHERE client_uuid IS NOT NULL;

ALTER TABLE allergies ADD COLUMN IF NOT EXISTS client_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_allergies_client_uuid ON allergies(client_uuid) WHERE client_uuid IS NOT NULL;

ALTER TABLE conditions ADD COLUMN IF NOT EXISTS client_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_conditions_client_uuid ON conditions(client_uuid) WHERE client_uuid IS NOT NULL;

ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS client_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_client_uuid ON emergency_contacts(client_uuid) WHERE client_uuid IS NOT NULL;

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allergies_updated_at ON allergies;
CREATE TRIGGER update_allergies_updated_at
    BEFORE UPDATE ON allergies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conditions_updated_at ON conditions;
CREATE TRIGGER update_conditions_updated_at
    BEFORE UPDATE ON conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
