-- Migration: 20260801173100_add_reason_and_dose_units_to_medications.sql
-- Description: Add reason, dose_value, and dose_unit columns to medications table

ALTER TABLE medications ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS dose_value TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS dose_unit TEXT;
