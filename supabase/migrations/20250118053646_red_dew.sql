/*
  # Add rewards tracking

  1. New Tables
    - `rewards`
      - `id` (uuid, primary key)
      - `member_id` (uuid, references members)
      - `points` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `rewards` table
    - Add policy for authenticated users
*/

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  points integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage rewards"
ON rewards
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to get rewards history
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
    json_agg(
      json_build_object(
        'id', id,
        'points', points,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ) as rewards_json
  FROM rewards
  WHERE member_id = member_id_param;
END;
$$ LANGUAGE plpgsql;