/*
  # Fix Penalty Reporting Functions

  1. Changes
    - Fix weekly report function to correctly count penalties
    - Fix monthly report function to correctly count penalties
    - Add proper subqueries for penalty aggregation
*/

-- First drop the existing functions
DROP FUNCTION IF EXISTS get_member_weekly_report(uuid);
DROP FUNCTION IF EXISTS get_member_monthly_report(uuid);

-- Recreate weekly report function with fixed penalty counting
CREATE OR REPLACE FUNCTION get_member_weekly_report(member_id_param uuid)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  bonus_tasks_completed bigint,
  points_earned bigint,
  penalties_count bigint,
  penalty_points bigint,
  week_start date,
  week_end date
) AS $$
DECLARE
  week_start_date date := date_trunc('week', CURRENT_DATE)::date;
  week_end_date date := (date_trunc('week', CURRENT_DATE) + interval '6 days')::date;
BEGIN
  RETURN QUERY
  WITH weekly_penalties AS (
    SELECT 
      COUNT(*)::bigint as penalty_count,
      COALESCE(SUM(points), 0)::bigint as total_penalty_points
    FROM penalties
    WHERE 
      member_id = member_id_param
      AND created_at::date >= week_start_date
      AND created_at::date <= week_end_date
  )
  SELECT 
    COALESCE(SUM(th.completed_tasks), 0)::bigint,
    COALESCE(SUM(th.completed_tasks), 0)::bigint,
    COALESCE(SUM(th.bonus_tasks), 0)::bigint,
    COALESCE(SUM(th.total_points), 0)::bigint,
    wp.penalty_count,
    wp.total_penalty_points,
    week_start_date,
    week_end_date
  FROM task_history th
  CROSS JOIN weekly_penalties wp
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= week_start_date
    AND th.task_date <= week_end_date
  GROUP BY wp.penalty_count, wp.total_penalty_points;
END;
$$ LANGUAGE plpgsql;

-- Recreate monthly report function with fixed penalty counting
CREATE OR REPLACE FUNCTION get_member_monthly_report(member_id_param uuid)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  bonus_tasks_completed bigint,
  points_earned bigint,
  penalties_count bigint,
  penalty_points bigint,
  completion_rate numeric,
  month_start date,
  month_end date
) AS $$
DECLARE
  month_start_date date := date_trunc('month', CURRENT_DATE)::date;
  month_end_date date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  total_days integer;
  days_with_tasks integer;
BEGIN
  -- Get the number of days in the current month with completed tasks
  SELECT COUNT(DISTINCT th.task_date)
  INTO days_with_tasks
  FROM task_history th
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= month_start_date
    AND th.task_date <= month_end_date
    AND th.completed_tasks > 0;

  -- Get total days in the current month
  SELECT EXTRACT(days FROM month_end_date)::integer
  INTO total_days;

  RETURN QUERY
  WITH monthly_penalties AS (
    SELECT 
      COUNT(*)::bigint as penalty_count,
      COALESCE(SUM(points), 0)::bigint as total_penalty_points
    FROM penalties
    WHERE 
      member_id = member_id_param
      AND created_at::date >= month_start_date
      AND created_at::date <= month_end_date
  )
  SELECT 
    COALESCE(SUM(th.completed_tasks), 0)::bigint,
    COALESCE(SUM(th.completed_tasks), 0)::bigint,
    COALESCE(SUM(th.bonus_tasks), 0)::bigint,
    COALESCE(SUM(th.total_points), 0)::bigint,
    mp.penalty_count,
    mp.total_penalty_points,
    ROUND((days_with_tasks::numeric / total_days::numeric) * 100, 2),
    month_start_date,
    month_end_date
  FROM task_history th
  CROSS JOIN monthly_penalties mp
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= month_start_date
    AND th.task_date <= month_end_date
  GROUP BY mp.penalty_count, mp.total_penalty_points, days_with_tasks, total_days;
END;
$$ LANGUAGE plpgsql;