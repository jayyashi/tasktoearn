/*
  # Fix admin associations and add share IDs
  
  1. Changes
    - Add share_id column for public sharing
    - Fix admin_id associations
    - Clean up data integrity
    
  2. Security
    - Maintain unique share IDs
    - Proper member-admin relationships
*/

-- First, create a function to get admin id from auth user id
CREATE OR REPLACE FUNCTION get_admin_id_from_auth(auth_user_id uuid)
RETURNS uuid AS $$
DECLARE
  found_admin_id uuid;
BEGIN
  SELECT id INTO found_admin_id
  FROM admins
  WHERE user_id = auth_user_id;
  RETURN found_admin_id;
END;
$$ LANGUAGE plpgsql;

-- Add share_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'members' 
    AND column_name = 'share_id'
  ) THEN
    ALTER TABLE members ADD COLUMN share_id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Generate share_id for any existing members that don't have one
UPDATE members 
SET share_id = gen_random_uuid() 
WHERE share_id IS NULL;

-- Make share_id NOT NULL
ALTER TABLE members 
ALTER COLUMN share_id SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_share_id_key'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_share_id_key UNIQUE (share_id);
  END IF;
END $$;

-- Update members table to associate with correct admin
DO $$ 
DECLARE
  member_record RECORD;
  first_admin_id uuid;
BEGIN
  -- First get a default admin id to use
  SELECT id INTO first_admin_id FROM admins LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    -- Update all members that don't have an admin_id
    UPDATE members AS m
    SET admin_id = first_admin_id
    WHERE m.admin_id IS NULL;
  END IF;
END $$;

-- Now that all members have an admin_id, make it required
ALTER TABLE members
ALTER COLUMN admin_id SET NOT NULL;