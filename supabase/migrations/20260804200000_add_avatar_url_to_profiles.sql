-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create uploads storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads bucket
CREATE POLICY "Public uploads access" ON storage.objects
    FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Users can update their own uploads" ON storage.objects
    FOR UPDATE USING (bucket_id = 'uploads');
