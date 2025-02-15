-- Create function to safely increment points
CREATE OR REPLACE FUNCTION increment_points(row_id uuid, points integer)
RETURNS integer AS $$
DECLARE
  current_points integer;
BEGIN
  SELECT total_points INTO current_points
  FROM members
  WHERE id = row_id;
  
  RETURN current_points + points;
END;
$$ LANGUAGE plpgsql;