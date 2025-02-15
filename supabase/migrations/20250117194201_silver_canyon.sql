/*
  # Fix tasks table icon constraint
  
  1. Changes
    - Add icon column to tasks table with a default value
    - Make icon column nullable for existing records
  
  2. Schema Update
    - tasks table:
      - Add `icon` column (text, nullable)
*/

-- Add icon column with a default value
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS icon text;