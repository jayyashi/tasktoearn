/*
  # Create storage bucket for profile images
  
  1. Changes
    - Create a new public storage bucket called 'profiles'
    - Enable public access to the bucket
  
  2. Security
    - Allow authenticated users to upload files
    - Allow public access to read files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

-- Create policy to allow public access to read files
CREATE POLICY "Allow public access to read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles');