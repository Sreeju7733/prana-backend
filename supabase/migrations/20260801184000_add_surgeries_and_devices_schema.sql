-- Migration: 20260801184000_add_surgeries_and_devices_schema.sql
-- Description: Add surgeries and devices tables + pregnancy/dnr fields to profiles

-- 1. Surgeries Table
CREATE TABLE IF NOT EXISTS surgeries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    procedure_name TEXT NOT NULL,
    date_performed DATE,
    hospital TEXT,
    surgeon TEXT,
    complications_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surgeries_user ON surgeries(user_id);

-- 2. Implanted Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    model_manufacturer TEXT,
    implant_date DATE,
    location_on_body TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

-- 3. Profile Additions for Emergency Directives
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pregnancy_status BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dnr_directive BOOLEAN DEFAULT false;
