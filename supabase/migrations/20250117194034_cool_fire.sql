/*
  # Update RLS policies for public access
  
  1. Changes
    - Update RLS policies to allow public access for members and tasks tables
    - Remove authentication requirement
  
  2. Security Note
    - This allows public access to all operations
    - Suitable for a simple habit tracker demo
    - In production, you may want to add authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON members;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON tasks;

-- Create new public access policies
CREATE POLICY "Allow public access" ON members
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);