/*
  # Update Report Functions

  1. Changes
    - Update weekly report function to use task_history table
    - Update monthly report function to use task_history table
    - Add total points calculation from task history

  2. Benefits
    - More accurate historical reporting
    - Proper accumulation of points over time
    - Better performance by using pre-calculated daily totals
*/

-- Update weekly report function to use task_history
CREATE OR REPLACE FUNCTION get_member_weekly_report(member_id_param uuid)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  bonus_tasks_completed bigint,
  points_earned bigint,
  week_start date,
  week_end date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(completed_tasks), 0)::bigint as total_tasks,
    COALESCE(SUM(completed_tasks), 0)::bigint as completed_tasks,
    COALESCE(SUM(bonus_tasks), 0)::bigint as bonus_tasks_completed,
    COALESCE(SUM(total_points), 0)::bigint as points_earned,
    date_trunc('week', CURRENT_DATE)::date as week_start,
    (date_trunc('week', CURRENT_DATE) + interval '6 days')::date as week_end
  FROM task_history
  WHERE 
    member_id = member_id_param
    AND task_date >= date_trunc('week', CURRENT_DATE)::date
    AND task_date <= (date_trunc('week', CURRENT_DATE) + interval '6 days')::date;
END;
$$ LANGUAGE plpgsql;

-- Update monthly report function to use task_history
CREATE OR REPLACE FUNCTION get_member_monthly_report(member_id_param uuid)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  bonus_tasks_completed bigint,
  points_earned bigint,
  completion_rate numeric,
  month_start date,
  month_end date
) AS $$
DECLARE
  total_days integer;
  days_with_tasks integer;
BEGIN
  -- Get the number of days in the current month with completed tasks
  SELECT COUNT(DISTINCT task_date)
  INTO days_with_tasks
  FROM task_history
  WHERE 
    member_id = member_id_param
    AND task_date >= date_trunc('month', CURRENT_DATE)::date
    AND task_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
    AND completed_tasks > 0;

  -- Get total days in the current month
  SELECT EXTRACT(days FROM date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::integer
  INTO total_days;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(completed_tasks), 0)::bigint as total_tasks,
    COALESCE(SUM(completed_tasks), 0)::bigint as completed_tasks,
    COALESCE(SUM(bonus_tasks), 0)::bigint as bonus_tasks_completed,
    COALESCE(SUM(total_points), 0)::bigint as points_earned,
    ROUND((days_with_tasks::numeric / total_days::numeric) * 100, 2) as completion_rate,
    date_trunc('month', CURRENT_DATE)::date as month_start,
    (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date as month_end
  FROM task_history
  WHERE 
    member_id = member_id_param
    AND task_date >= date_trunc('month', CURRENT_DATE)::date
    AND task_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
END;
$$ LANGUAGE plpgsql;