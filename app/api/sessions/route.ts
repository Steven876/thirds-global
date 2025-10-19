/**
 * Sessions API Route
 * 
 * Handles CRUD operations for work sessions.
 * GET: Returns sessions for a specific date or today
 * POST: Logs session start/stop/progress
 * 
 * TODO: Add proper authentication with Supabase
 * TODO: Add input validation with zod
 * TODO: Add session analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { listTasksForSession, addTask } from '../../../lib/db/crud';
import type { TaskStatus } from '../../../lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      const response: ApiResponse = { ok: false, error: 'session_id is required' };
      return NextResponse.json(response, { status: 400 });
    }
    const tasks = await listTasksForSession(request, Number(sessionId));
    const response: ApiResponse = { ok: true, data: tasks };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to fetch session tasks' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Body: { session_id: number, name: string, description?: string, duration_minutes?: number, status?: TaskStatus }
    if (!body?.session_id || !body?.name) {
      const response: ApiResponse = { ok: false, error: 'session_id and name are required' };
      return NextResponse.json(response, { status: 400 });
    }
    const task = await addTask(request, {
      session_id: Number(body.session_id),
      name: body.name,
      description: body.description ?? null,
      duration_minutes: body.duration_minutes ?? null,
      status: (body.status as TaskStatus) ?? 'active'
    });
    const response: ApiResponse = { ok: true, data: task };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to add task' };
    return NextResponse.json(response, { status: 500 });
  }
}
