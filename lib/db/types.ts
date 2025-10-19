// Database model types matching db/schema.sql

export type EnergyLevelDb = 'High' | 'Medium' | 'Low';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface DbUser {
  id: string; // UUID (auth.users.id)
  username: string | null;
  created_at: string; // timestamp
}

export interface DbSchedule {
  id: number; // serial
  user_id: string; // UUID
  day_of_week: DayOfWeek;
  sleep_time: string | null; // HH:MM:SS
  wake_time: string | null; // HH:MM:SS
  created_at: string; // timestamp
}

export interface DbSessionTemplate {
  id: number; // serial
  user_id: string; // UUID
  energy_type: EnergyLevelDb;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  created_at: string; // timestamptz
}

export interface DbSession {
  id: number; // serial
  schedule_id: number; // int
  template_id: number; // int
  created_at: string; // timestamp
}

export type TaskStatus = 'active' | 'completed' | 'skipped';

export interface DbTask {
  id: number; // serial
  session_id: number; // int
  name: string;
  description: string | null;
  duration_minutes: number | null; // positive
  status: TaskStatus; // default 'active'
  created_at: string; // timestamp
}


