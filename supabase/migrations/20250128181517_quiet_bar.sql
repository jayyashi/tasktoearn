/*
  # Add Penalty Feature

  1. New Tables
    - `penalties`
      - `id` (uuid, primary key)
      - `member_id` (uuid, references members)
      - `points` (integer)
      - `created_at` (timestamp)

  2. Updates
    - Add penalties to weekly and monthly reports
*/

-- Create penalties table
CREATE TABLE IF NOT EXISTS penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON penalties
FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON penalties
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update weekly report function to include penalties
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
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(th.completed_tasks), 0)::bigint as total_tasks,
    COALESCE(SUM(th.completed_tasks), 0)::bigint as completed_tasks,
    COALESCE(SUM(th.bonus_tasks), 0)::bigint as bonus_tasks_completed,
    COALESCE(SUM(th.total_points), 0)::bigint as points_earned,
    COUNT(p.id)::bigint as penalties_count,
    COALESCE(SUM(p.points), 0)::bigint as penalty_points,
    date_trunc('week', CURRENT_DATE)::date as week_start,
    (date_trunc('week', CURRENT_DATE) + interval '6 days')::date as week_end
  FROM task_history th
  LEFT JOIN penalties p ON p.member_id = th.member_id
    AND p.created_at >= date_trunc('week', CURRENT_DATE)
    AND p.created_at <= (date_trunc('week', CURRENT_DATE) + interval '6 days')
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= date_trunc('week', CURRENT_DATE)::date
    AND th.task_date <= (date_trunc('week', CURRENT_DATE) + interval '6 days')::date;
END;
$$ LANGUAGE plpgsql;

-- Update monthly report function to include penalties
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
    COUNT(p.id)::bigint as penalties_count,
    COALESCE(SUM(p.points), 0)::bigint as penalty_points,
    ROUND((days_with_tasks::numeric / total_days::numeric) * 100, 2) as completion_rate,
    date_trunc('month', CURRENT_DATE)::date as month_start,
    (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date as month_end
  FROM task_history th
  LEFT JOIN penalties p ON p.member_id = th.member_id
    AND p.created_at >= date_trunc('month', CURRENT_DATE)
    AND p.created_at <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')
  WHERE 
    th.member_id = member_id_param
    AND th.task_date >= date_trunc('month', CURRENT_DATE)::date
    AND th.task_date <= (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
END;
$$ LANGUAGE plpgsql;