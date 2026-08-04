-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create avatars storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Public avatars access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');
