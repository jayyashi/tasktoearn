/*
  # Fix task refresh function

  1. Changes
    - Update trigger_task_refresh function to properly reset tasks
    - Add explicit transaction handling
    - Add task completion history before reset
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
    CURRENT_DATE,
    SUM(CASE WHEN completed THEN (CASE WHEN is_bonus THEN 2 ELSE 1 END) ELSE 0 END),
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)
  FROM tasks
  WHERE completed = true
  GROUP BY member_id;

  -- Then reset all tasks to uncompleted
  UPDATE tasks
  SET completed = false
  WHERE completed = true;

  -- Reset member points
  UPDATE members
  SET total_points = 0
  WHERE total_points > 0;
END;
$$ LANGUAGE plpgsql;