/*
  # Add target points tracking
  
  1. Changes
    - Add target_points column to members table with default value of 0
    - Column is nullable to allow for members without targets
  
  2. Notes
    - Default value ensures backward compatibility
    - Integer type allows for whole number point targets
*/

-- Add target_points column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'members' 
    AND column_name = 'target_points'
  ) THEN
    ALTER TABLE members
    ADD COLUMN target_points integer DEFAULT 0;
  END IF;
END $$;