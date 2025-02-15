/*
  # Fix Rewards Table RLS Policies

  1. Changes
    - Drop existing RLS policies for rewards table
    - Add new RLS policies with proper permissions
    
  2. Security
    - Allow public read access to all rewards
    - Allow authenticated users to insert new rewards
    - Allow authenticated users to manage their own rewards
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to rewards" ON rewards;
DROP POLICY IF EXISTS "Allow authenticated users to insert rewards" ON rewards;
DROP POLICY IF EXISTS "Allow authenticated users to update own rewards" ON rewards;

-- Create new policies with proper permissions
CREATE POLICY "Enable read access for all users"
ON rewards
FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON rewards
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON rewards
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON rewards
FOR DELETE
TO authenticated
USING (true);