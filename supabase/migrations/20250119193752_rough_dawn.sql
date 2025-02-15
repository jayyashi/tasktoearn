/*
  # Daily Task System Implementation

  1. Changes
    - Add daily_points column to members table
    - Update points tracking system to handle both daily and total points
    - Add function to get daily points

  2. Security
    - Maintain existing RLS policies
*/

-- Add daily_points column to members
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS daily_points integer DEFAULT 0;

-- First drop the trigger, then the function
DROP TRIGGER IF EXISTS update_member_points_trigger ON tasks;
DROP FUNCTION IF EXISTS update_member_points();

-- Create improved member points update function
CREATE OR REPLACE FUNCTION update_member_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Update both daily and total points
  UPDATE members
  SET 
    daily_points = (
      SELECT COALESCE(SUM(points), 0)
      FROM tasks
      WHERE member_id = NEW.member_id
        AND completed = true
    ),
    total_points = total_points + (
      CASE 
        WHEN NEW.completed AND NOT OLD.completed THEN
          CASE WHEN NEW.is_bonus THEN 2 ELSE 1 END
        WHEN NOT NEW.completed AND OLD.completed THEN
          -1 * CASE WHEN NEW.is_bonus THEN 2 ELSE 1 END
        ELSE 0
      END
    )
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_member_points_trigger
AFTER UPDATE OF completed ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_member_points();

-- Drop and recreate task refresh function
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
    daily_points,
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)
  FROM members m
  LEFT JOIN tasks t ON t.member_id = m.id
  WHERE m.daily_points > 0 OR t.completed = true
  GROUP BY member_id, daily_points;

  -- Reset daily points to 0
  UPDATE members
  SET daily_points = 0
  WHERE daily_points > 0;

  -- Reset task completion status
  UPDATE tasks
  SET completed = false
  WHERE completed = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get member's daily points
CREATE OR REPLACE FUNCTION get_member_daily_points(member_id_param uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT daily_points
    FROM members
    WHERE id = member_id_param
  );
END;
$$ LANGUAGE plpgsql;