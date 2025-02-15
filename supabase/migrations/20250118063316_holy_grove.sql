/*
  # Add position field for task ordering

  1. Changes
    - Add position column to tasks table
    - Set default position based on creation order
    - Update existing tasks with sequential positions
*/

-- Add position column with a default value
ALTER TABLE tasks 
ADD COLUMN position serial;

-- Update existing tasks with sequential positions
WITH numbered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY created_at) as new_position
  FROM tasks
)
UPDATE tasks
SET position = numbered_tasks.new_position
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;