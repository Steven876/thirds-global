- ENERGY LEVEL ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'energy_level') THEN
    CREATE TYPE energy_level AS ENUM ('High', 'Medium', 'Low');
  END IF;
END$$;


-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week TEXT CHECK (
    day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
  ) NOT NULL,
  sleep_time TIME,
  wake_time TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, day_of_week)
);


-- SESSION TEMPLATE
CREATE TABLE IF NOT EXISTS session_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  energy_type energy_level NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, energy_type)
);


-- SESSION TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  schedule_id INT REFERENCES schedules(id) ON DELETE CASCADE,
  template_id INT REFERENCES session_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (schedule_id, template_id)
);


-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT CHECK (duration_minutes > 0),
  status TEXT CHECK (status IN ('active','completed','skipped')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);


-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT current_date,
  total_focus_seconds INTEGER DEFAULT 0,
  most_productive_block energy_level,
  most_paused_block energy_level,
  ai_recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
