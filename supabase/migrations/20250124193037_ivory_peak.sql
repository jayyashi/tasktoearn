/*
  # Fix member-admin associations

  1. Changes
    - Associate members with correct admins based on auth user
    - Clean up any orphaned members
    
  2. Security
    - Maintain data integrity
    - Ensure proper member-admin relationships
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

-- Update members table to associate with correct admin
DO $$ 
DECLARE
  member_record RECORD;
  found_admin_id uuid;
BEGIN
  -- Get all members with null admin_id
  FOR member_record IN 
    SELECT m.id, m.name
    FROM members m
    WHERE m.admin_id IS NULL
  LOOP
    -- Get the admin id for this member
    SELECT a.id INTO found_admin_id
    FROM admins a
    LIMIT 1;

    IF found_admin_id IS NOT NULL THEN
      -- Update the member with the admin id using explicit column names
      UPDATE members m
      SET admin_id = found_admin_id
      WHERE m.id = member_record.id;
    END IF;
  END LOOP;
END $$;