/*
  # Verify cron job setup and add test functions

  1. Changes
    - Add function to check cron job status
    - Add function to manually trigger task refresh for testing
*/

-- Function to check if cron job is scheduled
CREATE OR REPLACE FUNCTION check_cron_schedule()
RETURNS TABLE (
  jobname text,
  schedule text,
  last_run timestamptz,
  next_run timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.jobname,
    c.schedule,
    c.last_run,
    c.next_run
  FROM cron.job c
  WHERE c.jobname = 'archive-daily-tasks';
END;
$$ LANGUAGE plpgsql;

-- Function to manually trigger task refresh (for testing only)
CREATE OR REPLACE FUNCTION trigger_task_refresh()
RETURNS void AS $$
BEGIN
  PERFORM archive_daily_tasks();
END;
$$ LANGUAGE plpgsql;