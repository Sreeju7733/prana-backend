-- Migration: 20260801172000_create_otp_logs.sql
-- Description: Create otp_logs table for OTP authentication verification

CREATE TABLE IF NOT EXISTS otp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    is_used BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_logs_phone ON otp_logs(phone);
CREATE INDEX IF NOT EXISTS idx_otp_logs_verify ON otp_logs(phone, otp_code, is_used);
