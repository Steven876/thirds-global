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
import { ApiResponse, Session } from '@/lib/types';

// Mock data for development
const mockSessions: Session[] = [
  {
    id: '1',
    user_id: 'user-1',
    session_date: '2024-01-15',
    block: 'morning',
    task: 'Deep Work',
    duration_seconds: 3600, // 1 hour
    completed: true,
    paused: false,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    session_date: '2024-01-15',
    block: 'afternoon',
    task: 'Meetings',
    duration_seconds: 1800, // 30 minutes
    completed: false,
    paused: true,
    created_at: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // TODO: Get user ID from Supabase auth
    const userId = 'user-1'; // Mock user ID
    
    // TODO: Replace with actual Supabase query
    // const { data, error } = await supabase
    //   .from('sessions')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('session_date', date);
    
    // Mock response
    const userSessions = mockSessions.filter(s => 
      s.user_id === userId && s.session_date === date
    );

    const response: ApiResponse<Session[]> = {
      ok: true,
      data: userSessions
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    const response: ApiResponse = {
      ok: false,
      error: 'Failed to fetch sessions'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Validate request body
    if (!body || !body.block || !body.task) {
      const response: ApiResponse = {
        ok: false,
        error: 'Missing required fields: block, task'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // TODO: Get user ID from Supabase auth
    const userId = 'user-1'; // Mock user ID
    
    const sessionData: Partial<Session> = {
      user_id: userId,
      session_date: body.session_date || new Date().toISOString().split('T')[0],
      block: body.block,
      task: body.task,
      duration_seconds: body.duration_seconds || 0,
      completed: body.completed || false,
      paused: body.paused || false
    };

    // TODO: Replace with actual Supabase insert/update
    // const { data, error } = await supabase
    //   .from('sessions')
    //   .upsert(sessionData)
    //   .select()
    //   .single();

    // Mock success response
    const newSession: Session = {
      ...sessionData as Session,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };

    const response: ApiResponse<Session> = {
      ok: true,
      data: newSession
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving session:', error);
    
    const response: ApiResponse = {
      ok: false,
      error: 'Failed to save session'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
