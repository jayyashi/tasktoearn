/*
  # Fix tasks icon column constraint
  
  1. Changes
    - Drop NOT NULL constraint from icon column
    - Set default value for icon column
  
  2. Schema Update
    - tasks table:
      - Make `icon` column nullable
      - Add default value for `icon`
*/

-- First ensure the column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'icon'
  ) THEN
    -- Drop the NOT NULL constraint
    ALTER TABLE tasks 
    ALTER COLUMN icon DROP NOT NULL;
    
    -- Set a default value for new records
    ALTER TABLE tasks
    ALTER COLUMN icon SET DEFAULT 'default';
  END IF;
END $$;