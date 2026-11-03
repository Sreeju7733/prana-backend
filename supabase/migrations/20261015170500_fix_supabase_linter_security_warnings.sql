-- ==============================================================================
-- Migration: 20261015170500_fix_supabase_linter_security_warnings.sql
-- Description:
--   1. Enable Row Level Security (RLS) on public tables:
--      - verified_hospitals
--      - hospital_staff
--      - verified_responders
--      - surgeries
--      - devices
--   2. Add RLS policies for each table.
--   3. Recreate views with WITH (security_invoker = true) to resolve Security Definer View warnings.
-- ==============================================================================

-- 1. Enable RLS on verified_hospitals & hospital_staff
ALTER TABLE IF EXISTS public.verified_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hospital_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages verified_hospitals" ON public.verified_hospitals;
CREATE POLICY "Service role manages verified_hospitals" 
    ON public.verified_hospitals 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read active verified_hospitals" ON public.verified_hospitals;
CREATE POLICY "Allow read active verified_hospitals" 
    ON public.verified_hospitals 
    FOR SELECT 
    TO authenticated, anon 
    USING (is_active = true);

DROP POLICY IF EXISTS "Service role manages hospital_staff" ON public.hospital_staff;
CREATE POLICY "Service role manages hospital_staff" 
    ON public.hospital_staff 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read active hospital_staff" ON public.hospital_staff;
CREATE POLICY "Allow read active hospital_staff" 
    ON public.hospital_staff 
    FOR SELECT 
    TO authenticated, anon 
    USING (is_active = true);

-- 2. Enable RLS on verified_responders
ALTER TABLE IF EXISTS public.verified_responders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages verified_responders" ON public.verified_responders;
CREATE POLICY "Service role manages verified_responders" 
    ON public.verified_responders 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read active verified_responders" ON public.verified_responders;
CREATE POLICY "Allow read active verified_responders" 
    ON public.verified_responders 
    FOR SELECT 
    TO authenticated, anon 
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 3. Enable RLS on surgeries and devices
ALTER TABLE IF EXISTS public.surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages surgeries" ON public.surgeries;
CREATE POLICY "Service role manages surgeries" 
    ON public.surgeries 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own surgeries" ON public.surgeries;
CREATE POLICY "Users can manage own surgeries" 
    ON public.surgeries 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages devices" ON public.devices;
CREATE POLICY "Service role manages devices" 
    ON public.devices 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own devices" ON public.devices;
CREATE POLICY "Users can manage own devices" 
    ON public.devices 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 4. Recreate Views with security_invoker = true
DROP VIEW IF EXISTS public.public_green_data CASCADE;
DROP VIEW IF EXISTS public.paramedic_yellow_data CASCADE;

CREATE OR REPLACE VIEW public.public_green_data
WITH (security_invoker = true) AS
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
FROM public.profiles p
LEFT JOIN public.allergies a ON a.user_id = p.id AND a.is_critical = true
WHERE p.card_status = 'active'
GROUP BY p.id;

CREATE OR REPLACE VIEW public.paramedic_yellow_data
WITH (security_invoker = true) AS
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
FROM public.profiles p
LEFT JOIN public.allergies a ON a.user_id = p.id
LEFT JOIN public.medications m ON m.user_id = p.id
LEFT JOIN public.conditions c ON c.user_id = p.id
WHERE p.card_status = 'active'
GROUP BY p.id;
