/*
  # Rename admin name column

  1. Changes
    - Rename 'name' column to 'full_name' in admins table
    - Update trigger to use correct column name
*/

-- Rename the column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admins' AND column_name = 'name'
  ) THEN
    ALTER TABLE admins RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- Drop and recreate the trigger function with the correct column name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO admins (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;