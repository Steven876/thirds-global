/**
 * Schedule API Route
 * 
 * Handles CRUD operations for user schedules.
 * GET: Returns user's schedules grouped by block
 * POST: Creates or updates schedules for each block
 * 
 * TODO: Add proper authentication with Supabase
 * TODO: Add input validation with zod
 * TODO: Add rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { upsertSchedule, upsertSessionTemplate, createSession, listSessionsForSchedule } from '../../../lib/db/crud';
import type { DayOfWeek, EnergyLevelDb } from '../../../lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('schedule_id');
    if (!scheduleId) {
      const response: ApiResponse = { ok: false, error: 'schedule_id is required' };
      return NextResponse.json(response, { status: 400 });
    }

    const sessions = await listSessionsForSchedule(request, Number(scheduleId));
    const response: ApiResponse = { ok: true, data: sessions };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to fetch schedule sessions' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Body contract:
    // {
    //   user_id: string,
    //   day_of_week: DayOfWeek,
    //   sleep_time: HH:MM[:SS] | null,
    //   wake_time: HH:MM[:SS] | null,
    //   sessions: [
    //     { energy_type: EnergyLevelDb, start_time: HH:MM[:SS], end_time: HH:MM[:SS] }, ... (3 items)
    //   ]
    // }
    if (!body?.user_id || !body?.day_of_week || !Array.isArray(body?.sessions) || body.sessions.length !== 3) {
      const response: ApiResponse = { ok: false, error: 'Invalid body: provide user_id, day_of_week, sleep_time, wake_time, and exactly 3 sessions.' };
      return NextResponse.json(response, { status: 400 });
    }

    const schedule = await upsertSchedule(request, {
      user_id: body.user_id as string,
      day_of_week: body.day_of_week as DayOfWeek,
      sleep_time: body.sleep_time ?? null,
      wake_time: body.wake_time ?? null
    });

    // Upsert templates and create sessions linked to schedule
    const createdSessionIds: number[] = [];
    for (const s of body.sessions as Array<{ energy_type: EnergyLevelDb; start_time: string; end_time: string }>) {
      const template = await upsertSessionTemplate(request, {
        user_id: body.user_id as string,
        energy_type: s.energy_type,
        start_time: s.start_time,
        end_time: s.end_time
      });
      const session = await createSession(request, { schedule_id: schedule.id, template_id: template.id });
      createdSessionIds.push(session.id);
    }

    const response: ApiResponse = { ok: true, data: { schedule_id: schedule.id, session_ids: createdSessionIds } };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to save schedule' };
    return NextResponse.json(response, { status: 500 });
  }
}
