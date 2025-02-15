/*
  # Add admin_id to members table
  
  This migration adds the admin_id column to the members table
  and updates existing members to be associated with their admin.
*/

DO $$ 
BEGIN
  -- Only add the column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'members' 
    AND column_name = 'admin_id'
  ) THEN
    -- Add admin_id column
    ALTER TABLE members
    ADD COLUMN admin_id uuid REFERENCES admins(id) ON DELETE CASCADE;
  END IF;
END $$;