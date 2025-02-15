/*
  # Add daily task refresh scheduler

  1. Changes
    - Add pgcron extension if not exists
    - Create a scheduled job to run archive_daily_tasks() function at midnight
    
  2. Security
    - No additional security needed as this runs automatically
*/

-- Enable pgcron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the archive_daily_tasks function to run at midnight every day
SELECT cron.schedule(
  'archive-daily-tasks',  -- unique job name
  '0 0 * * *',           -- cron expression: run at midnight (00:00)
  $$SELECT archive_daily_tasks()$$
);