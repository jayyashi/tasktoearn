/*
  # Fix member admin associations

  1. Changes
    - Ensure all members have an admin_id
    - Make admin_id required
    
  2. Security
    - Maintain data integrity
    - Handle existing records
*/

-- First, get the first admin id to use as a fallback
DO $$ 
DECLARE
  default_admin_id uuid;
BEGIN
  -- Get the first admin id
  SELECT id INTO default_admin_id FROM admins LIMIT 1;
  
  -- Update any members that don't have an admin_id
  IF default_admin_id IS NOT NULL THEN
    UPDATE members 
    SET admin_id = default_admin_id
    WHERE admin_id IS NULL;
  END IF;
END $$;

-- Now we can safely make admin_id NOT NULL
ALTER TABLE members
ALTER COLUMN admin_id SET NOT NULL;