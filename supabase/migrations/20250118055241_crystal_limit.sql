/*
  # Fix Rewards Table Structure and Permissions

  1. Changes
    - Recreate rewards table with proper structure
    - Update RLS policies
    
  2. Security
    - Enable RLS
    - Allow public read access
    - Allow authenticated users to manage rewards
*/

-- Drop and recreate the rewards table
DROP TABLE IF EXISTS rewards CASCADE;

CREATE TABLE rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Create policies with proper permissions
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

-- Recreate the rewards history function
CREATE OR REPLACE FUNCTION get_member_rewards_history(member_id_param uuid)
RETURNS TABLE (
  total_rewards bigint,
  total_points_rewarded bigint,
  rewards_json json
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_rewards,
    COALESCE(SUM(points), 0)::bigint as total_points_rewarded,
    COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'points', points,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ),
      '[]'::json
    ) as rewards_json
  FROM rewards
  WHERE member_id = member_id_param;
END;
$$ LANGUAGE plpgsql;