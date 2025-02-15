-- First, disable RLS temporarily to avoid any policy conflicts
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
  -- Drop all policies from admins table
  DROP POLICY IF EXISTS "AdminProfile_View_20250121" ON admins;
  DROP POLICY IF EXISTS "AdminProfile_Update_20250121" ON admins;
  DROP POLICY IF EXISTS "Users can view own admin profile" ON admins;
  DROP POLICY IF EXISTS "Users can update own admin profile" ON admins;
  DROP POLICY IF EXISTS "Admin View Own Profile" ON admins;
  DROP POLICY IF EXISTS "Admin Update Own Profile" ON admins;
  
  -- Drop all policies from members table
  DROP POLICY IF EXISTS "Members_View_20250121" ON members;
  DROP POLICY IF EXISTS "Members_Manage_20250121" ON members;
  DROP POLICY IF EXISTS "Member View By Admin" ON members;
  DROP POLICY IF EXISTS "Member Manage By Admin" ON members;
  DROP POLICY IF EXISTS "Users can view own members" ON members;
  DROP POLICY IF EXISTS "Users can manage own members" ON members;
  DROP POLICY IF EXISTS "Allow public read access to members" ON members;
  DROP POLICY IF EXISTS "Allow authenticated users to manage members" ON members;
  
  -- Drop all policies from tasks table
  DROP POLICY IF EXISTS "Tasks_View_20250121" ON tasks;
  DROP POLICY IF EXISTS "Tasks_Manage_20250121" ON tasks;
  DROP POLICY IF EXISTS "Task View By Admin" ON tasks;
  DROP POLICY IF EXISTS "Task Manage By Admin" ON tasks;
  DROP POLICY IF EXISTS "Users can view tasks of own members" ON tasks;
  DROP POLICY IF EXISTS "Users can manage tasks of own members" ON tasks;
  DROP POLICY IF EXISTS "Allow public read access to tasks" ON tasks;
  DROP POLICY IF EXISTS "Allow authenticated users to manage tasks" ON tasks;
END $$;

-- Re-enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique timestamps to avoid conflicts
CREATE POLICY "AdminProfile_View_20250121_v2"
ON admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "AdminProfile_Update_20250121_v2"
ON admins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members_View_20250121_v2"
ON members
FOR SELECT
TO authenticated
USING (
  admin_id IN (
    SELECT id FROM admins WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members_Manage_20250121_v2"
ON members
FOR ALL
TO authenticated
USING (
  admin_id IN (
    SELECT id FROM admins WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  admin_id IN (
    SELECT id FROM admins WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Tasks_View_20250121_v2"
ON tasks
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM members 
    WHERE admin_id IN (
      SELECT id FROM admins 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Tasks_Manage_20250121_v2"
ON tasks
FOR ALL
TO authenticated
USING (
  member_id IN (
    SELECT id FROM members 
    WHERE admin_id IN (
      SELECT id FROM admins 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  member_id IN (
    SELECT id FROM members 
    WHERE admin_id IN (
      SELECT id FROM admins 
      WHERE user_id = auth.uid()
    )
  )
);