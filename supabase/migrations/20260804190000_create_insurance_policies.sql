-- Create insurance_policies table
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    group_number TEXT,
    helpline_phone TEXT,
    coverage_type TEXT DEFAULT 'Comprehensive Cashless',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_policies
CREATE POLICY "Users can manage their own insurance" ON public.insurance_policies
    FOR ALL USING (auth.uid() = user_id);

-- Ensure weight_kg and height_cm exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
