/*
  # Fix Report Functions

  1. Changes
    - Fix ambiguous column references in weekly report function
    - Fix ambiguous column references in monthly report function
    - Add table aliases for clarity
    - Improve column selection

  2. Benefits
    - Resolves the ambiguous column reference error
    - Makes the queries more explicit and maintainable
    - Improves query performance with better column selection
*/

-- Update weekly report function with explicit column references
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
    COALESCE(SUM(th.completed_tasks), 0)::bigint as total_tasks,
    COALESCE(SUM(th.completed_tasks), 0)::bigint as completed_tasks,
    COALESCE(SUM(th.bonus_tasks), 0)::bigint as bonus_tasks_completed,
    COALESCE(SUM(th.total_points), 0)::bigint as points_earned,
    date_trunc('week', CURRENT_DATE)::date as week_start,
    (date_trunc('week', CURRENT_DATE) + interval '6 days')::date as week_end
  FROM task_history th
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= date_trunc('week', CURRENT_DATE)::date
    AND th.task_date <= (date_trunc('week', CURRENT_DATE) + interval '6 days')::date;
END;
$$ LANGUAGE plpgsql;

-- Update monthly report function with explicit column references
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
  SELECT COUNT(DISTINCT th.task_date)
  INTO days_with_tasks
  FROM task_history th
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= date_trunc('month', CURRENT_DATE)::date
    AND th.task_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
    AND th.completed_tasks > 0;

  -- Get total days in the current month
  SELECT EXTRACT(days FROM date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::integer
  INTO total_days;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(th.completed_tasks), 0)::bigint as total_tasks,
    COALESCE(SUM(th.completed_tasks), 0)::bigint as completed_tasks,
    COALESCE(SUM(th.bonus_tasks), 0)::bigint as bonus_tasks_completed,
    COALESCE(SUM(th.total_points), 0)::bigint as points_earned,
    ROUND((days_with_tasks::numeric / total_days::numeric) * 100, 2) as completion_rate,
    date_trunc('month', CURRENT_DATE)::date as month_start,
    (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date as month_end
  FROM task_history th
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= date_trunc('month', CURRENT_DATE)::date
    AND th.task_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
END;
$$ LANGUAGE plpgsql;