/*
  # Fix daily task refresh function

  1. Changes
    - Remove total points reset
    - Only reset task completion status
    - Preserve task history
*/

-- Drop existing function
DROP FUNCTION IF EXISTS trigger_task_refresh();

-- Create improved task refresh function
CREATE OR REPLACE FUNCTION trigger_task_refresh()
RETURNS void AS $$
BEGIN
  -- First archive completed tasks
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
    SUM(CASE WHEN completed THEN (CASE WHEN is_bonus THEN 2 ELSE 1 END) ELSE 0 END),
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)
  FROM tasks
  WHERE completed = true
  GROUP BY member_id;

  -- Then reset only task completion status
  UPDATE tasks
  SET completed = false
  WHERE completed = true;
END;
$$ LANGUAGE plpgsql;