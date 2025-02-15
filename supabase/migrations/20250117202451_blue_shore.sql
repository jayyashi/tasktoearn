/*
  # Update RLS policies for better access control
  
  1. Changes
    - Update RLS policies for members and tasks tables
    - Add more granular control over operations
  
  2. Security
    - Allow public read access to members and tasks
    - Allow authenticated users to perform all operations
*/

-- Update members table policies
CREATE POLICY "Allow public read access to members"
ON members
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to manage members"
ON members
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Update tasks table policies
CREATE POLICY "Allow public read access to tasks"
ON tasks
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to manage tasks"
ON tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);