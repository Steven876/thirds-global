import { NextRequest } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabaseClient';
import type {
  DbSchedule,
  DbSession,
  DbSessionTemplate,
  DbTask,
  DayOfWeek,
  EnergyLevelDb,
  TaskStatus
} from './types';

export async function upsertSchedule(
  req: NextRequest,
  input: {
    user_id: string;
    day_of_week: DayOfWeek;
    sleep_time?: string | null;
    wake_time?: string | null;
  }
): Promise<DbSchedule> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('schedules')
    .upsert(
      [
        {
          user_id: input.user_id,
          day_of_week: input.day_of_week,
          sleep_time: input.sleep_time ?? null,
          wake_time: input.wake_time ?? null
        }
      ],
      { onConflict: 'user_id,day_of_week' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as DbSchedule;
}

export async function upsertSessionTemplate(
  req: NextRequest,
  input: {
    user_id: string;
    energy_type: EnergyLevelDb;
    start_time: string; // HH:MM:SS
    end_time: string; // HH:MM:SS
  }
): Promise<DbSessionTemplate> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('session_templates')
    .upsert(
      [
        {
          user_id: input.user_id,
          energy_type: input.energy_type,
          start_time: input.start_time,
          end_time: input.end_time
        }
      ],
      { onConflict: 'user_id,energy_type' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as DbSessionTemplate;
}

export async function createSession(
  req: NextRequest,
  input: { schedule_id: number; template_id: number }
): Promise<DbSession> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('sessions')
    .insert([
      {
        schedule_id: input.schedule_id,
        template_id: input.template_id
      }
    ])
    .select()
    .single();
  if (error) throw error;
  return data as DbSession;
}

export async function listSessionsForSchedule(
  req: NextRequest,
  schedule_id: number
): Promise<DbSession[]> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('schedule_id', schedule_id)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbSession[];
}

export async function addTask(
  req: NextRequest,
  input: {
    session_id: number;
    name: string;
    description?: string | null;
    duration_minutes?: number | null;
    status?: TaskStatus;
  }
): Promise<DbTask> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        session_id: input.session_id,
        name: input.name,
        description: input.description ?? null,
        duration_minutes: input.duration_minutes ?? null,
        status: input.status ?? 'active'
      }
    ])
    .select()
    .single();
  if (error) throw error;
  return data as DbTask;
}

export async function listTasksForSession(
  req: NextRequest,
  session_id: number
): Promise<DbTask[]> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('session_id', session_id)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbTask[];
}

export async function updateTask(
  req: NextRequest,
  id: number,
  input: Partial<Pick<DbTask, 'name' | 'description' | 'duration_minutes' | 'status'>>
): Promise<DbTask> {
  const supabase = getSupabaseFromRequest(req);
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbTask;
}

export async function deleteTask(req: NextRequest, id: number): Promise<void> {
  const supabase = getSupabaseFromRequest(req);
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}


