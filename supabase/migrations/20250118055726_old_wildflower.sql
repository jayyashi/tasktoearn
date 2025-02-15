/*
  # Fix Rewards RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new simplified policies for rewards table
    
  2. Security
    - Allow public read access
    - Allow authenticated users to manage rewards without restrictions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON rewards;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON rewards;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON rewards;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON rewards;

-- Create simplified policies
CREATE POLICY "Public read access"
ON rewards
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users full access"
ON rewards
USING (auth.role() = 'authenticated');

-- Disable RLS temporarily and re-enable to ensure clean state
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;