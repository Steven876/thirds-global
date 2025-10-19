-- High-value indexes for faster schedule/session/task lookups

create index if not exists idx_schedules_user_day on schedules(user_id, day_of_week);
create index if not exists idx_sessions_schedule_id on sessions(schedule_id);
create index if not exists idx_templates_user_energy on session_templates(user_id, energy_type);
create index if not exists idx_tasks_session_id on tasks(session_id);


