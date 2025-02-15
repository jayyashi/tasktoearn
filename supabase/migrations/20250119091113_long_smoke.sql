/*
  # Add daily task reset functionality

  1. New Tables
    - `task_history`
      - `id` (uuid, primary key)
      - `member_id` (uuid, references members)
      - `task_date` (date)
      - `total_points` (integer)
      - `completed_tasks` (integer)
      - `bonus_tasks` (integer)

  2. Changes
    - Add function to reset daily tasks
    - Add function to archive daily task stats
*/

-- Create task history table
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  task_date date DEFAULT CURRENT_DATE,
  total_points integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  bonus_tasks integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON task_history
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON task_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to archive daily task stats
CREATE OR REPLACE FUNCTION archive_daily_tasks()
RETURNS void AS $$
BEGIN
  -- Insert daily stats into history
  INSERT INTO task_history (
    member_id,
    task_date,
    total_points,
    completed_tasks,
    bonus_tasks
  )
  SELECT 
    member_id,
    CURRENT_DATE - interval '1 day',
    COUNT(*) FILTER (WHERE completed = true) * CASE WHEN is_bonus THEN 2 ELSE 1 END,
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)
  FROM tasks
  WHERE 
    completed = true 
    AND DATE(created_at) = CURRENT_DATE - interval '1 day'
  GROUP BY member_id;

  -- Reset completed status for all tasks
  UPDATE tasks
  SET completed = false
  WHERE completed = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get task history
CREATE OR REPLACE FUNCTION get_member_task_history(member_id_param uuid)
RETURNS TABLE (
  date date,
  total_points integer,
  completed_tasks integer,
  bonus_tasks integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    task_date,
    total_points,
    completed_tasks,
    bonus_tasks
  FROM task_history
  WHERE member_id = member_id_param
  ORDER BY task_date DESC;
END;
$$ LANGUAGE plpgsql;