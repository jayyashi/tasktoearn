/*
  # Habit Tracker Schema

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)
      - `total_points` (integer)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key)
      - `title` (text)
      - `is_bonus` (boolean)
      - `completed` (boolean)
      - `created_at` (timestamp)
      - `points` (integer)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage members and tasks
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  total_points integer DEFAULT 0
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_bonus boolean DEFAULT false,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  points integer GENERATED ALWAYS AS (
    CASE WHEN completed = true THEN
      CASE WHEN is_bonus = true THEN 2 ELSE 1 END
    ELSE 0 END
  ) STORED
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users" ON members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update member points
CREATE OR REPLACE FUNCTION update_member_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE members
  SET total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM tasks
    WHERE member_id = NEW.member_id
  )
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update points on task changes
CREATE TRIGGER update_member_points_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_member_points();