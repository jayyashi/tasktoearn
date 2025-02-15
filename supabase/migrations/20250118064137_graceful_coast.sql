/*
  # Fix task reordering functionality

  1. Changes
    - Add a function to safely update task positions
    - Function handles position swapping between two tasks
    - Ensures proper WHERE clauses are used
*/

-- Create a function to safely update task positions
CREATE OR REPLACE FUNCTION update_task_positions(
  task_id1 uuid,
  position1 integer,
  task_id2 uuid,
  position2 integer
)
RETURNS void AS $$
BEGIN
  -- Update first task
  UPDATE tasks
  SET position = position1
  WHERE id = task_id1;

  -- Update second task
  UPDATE tasks
  SET position = position2
  WHERE id = task_id2;
END;
$$ LANGUAGE plpgsql;