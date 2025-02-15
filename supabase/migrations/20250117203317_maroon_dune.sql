/*
  # Add member reports functionality
  
  1. New Functions
    - get_member_weekly_report: Calculates weekly stats for a member
    - get_member_monthly_report: Calculates monthly stats for a member
  
  2. Changes
    - Add functions to calculate task completion statistics
    - Add helper functions for date calculations
*/

-- Function to get weekly report for a member
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
    COUNT(*)::bigint as total_tasks,
    COUNT(*) FILTER (WHERE completed = true)::bigint as completed_tasks,
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)::bigint as bonus_tasks_completed,
    COALESCE(SUM(points), 0)::bigint as points_earned,
    date_trunc('week', CURRENT_TIMESTAMP)::date as week_start,
    (date_trunc('week', CURRENT_TIMESTAMP) + interval '6 days')::date as week_end
  FROM tasks
  WHERE 
    member_id = member_id_param
    AND created_at >= date_trunc('week', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('week', CURRENT_TIMESTAMP) + interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly report for a member
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
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_tasks,
    COUNT(*) FILTER (WHERE completed = true)::bigint as completed_tasks,
    COUNT(*) FILTER (WHERE completed = true AND is_bonus = true)::bigint as bonus_tasks_completed,
    COALESCE(SUM(points), 0)::bigint as points_earned,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE completed = true)::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as completion_rate,
    date_trunc('month', CURRENT_TIMESTAMP)::date as month_start,
    (date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month - 1 day')::date as month_end
  FROM tasks
  WHERE 
    member_id = member_id_param
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month';
END;
$$ LANGUAGE plpgsql;