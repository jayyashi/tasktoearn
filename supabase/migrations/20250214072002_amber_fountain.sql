/*
  # Add name field to admins table

  1. Changes
    - Add name column to admins table
    - Update handle_new_user function to store name from auth metadata
*/

-- Add name column to admins table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admins' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE admins ADD COLUMN name text;
  END IF;
END $$;

-- Update handle_new_user function to store name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO admins (user_id, name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Admin'
    )
  );
  RETURN new;
END;
$$;