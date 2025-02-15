export interface Member {
  id: string;
  name: string;
  created_at: string;
  total_points: number;
  daily_points: number;
  profile_image_url: string;
  banner_image_url: string;
  target_points: number;
  share_id: string;
}

export interface Task {
  id: string;
  member_id: string;
  title: string;
  is_bonus: boolean;
  completed: boolean;
  created_at: string;
  points: number;
  position: number;
  icon: string;
}

export interface WeeklyReport {
  total_tasks: number;
  completed_tasks: number;
  bonus_tasks_completed: number;
  points_earned: number;
  penalties_count: number;
  penalty_points: number;
  week_start: string;
  week_end: string;
}

export interface MonthlyReport {
  total_tasks: number;
  completed_tasks: number;
  bonus_tasks_completed: number;
  points_earned: number;
  penalties_count: number;
  penalty_points: number;
  completion_rate: number;
  month_start: string;
  month_end: string;
}

export interface Admin {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  created_at: string;
}

export interface Reward {
  id: string;
  member_id: string;
  points: number;
  created_at: string;
}

export interface RewardHistory {
  total_rewards: number;
  total_points_rewarded: number;
  rewards_json: Reward[];
}