/*
  # Fix Rewards RLS Policies

  1. Changes
    - Drop existing RLS policy for rewards table
    - Add more specific RLS policies for different operations
    - Allow public to read rewards
    - Allow authenticated users to insert rewards
    
  2. Security
    - Enable RLS on rewards table (already enabled)
    - Add policy for public read access
    - Add policy for authenticated users to insert records
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow authenticated users to manage rewards" ON rewards;

-- Create new policies
CREATE POLICY "Allow public read access to rewards"
ON rewards
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to insert rewards"
ON rewards
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update own rewards"
ON rewards
FOR UPDATE
TO authenticated
USING (auth.uid() IN (
  SELECT id 
  FROM members 
  WHERE id = rewards.member_id
))
WITH CHECK (auth.uid() IN (
  SELECT id 
  FROM members 
  WHERE id = rewards.member_id
));