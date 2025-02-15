-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_task_positions;

-- Create a function to safely update task positions
CREATE OR REPLACE FUNCTION update_task_positions(
  task_id1 uuid,
  position1 integer,
  task_id2 uuid,
  position2 integer
)
RETURNS void AS $$
BEGIN
  -- Start an atomic update
  UPDATE tasks
  SET position = CASE
    WHEN id = task_id1 THEN position1
    WHEN id = task_id2 THEN position2
  END
  WHERE id IN (task_id1, task_id2);
END;
$$ LANGUAGE plpgsql;