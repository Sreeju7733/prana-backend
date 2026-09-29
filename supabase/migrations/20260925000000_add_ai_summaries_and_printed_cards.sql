-- Migration: AI Summaries + Printed Cards + Revocations
-- Description: Add tables for AI report summaries, printed card fingerprints,
--              and revocation tracking fields

-- AI Summaries table
CREATE TABLE IF NOT EXISTS ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_url TEXT NOT NULL,
    summary JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_user ON ai_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_created ON ai_summaries(created_at DESC);

-- Add revoked and suspended_at columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Add flags column to profiles (for critical flags in QR)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS flags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add notes column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- Print card fingerprints table
CREATE TABLE IF NOT EXISTS printed_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,  -- SHA-256 hash of printed fields
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_printed_cards_user ON printed_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_printed_cards_fingerprint ON printed_cards(fingerprint);
