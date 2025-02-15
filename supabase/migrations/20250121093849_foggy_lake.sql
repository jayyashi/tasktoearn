/*
  # Fix admin profile creation

  1. Changes
    - Drop and recreate admin profile creation trigger with proper error handling
    - Add proper constraints and defaults
    - Ensure clean state for auth triggers

  2. Security
    - Maintain RLS policies
    - Use security definer for proper permissions
*/

-- First clean up any existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert admin profile with error handling
  BEGIN
    INSERT INTO admins (user_id)
    VALUES (new.id);
  EXCEPTION WHEN OTHERS THEN
    -- Log error details (in a real system, you'd want proper error logging)
    RAISE NOTICE 'Error creating admin profile: %', SQLERRM;
    RETURN null;
  END;
  
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure admins table has proper constraints
ALTER TABLE admins
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- Refresh RLS
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;