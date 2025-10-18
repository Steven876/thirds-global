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
import { ApiResponse, Schedule } from '@/lib/types';

// Mock data for development
const mockSchedules: Schedule[] = [
  {
    id: '1',
    user_id: 'user-1',
    block: 'morning',
    start_time: '06:00',
    end_time: '12:00',
    energy: 'high',
    task: 'Deep Work',
    notes: 'Focus on complex tasks',
    recurring_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    user_id: 'user-1',
    block: 'afternoon',
    start_time: '12:00',
    end_time: '18:00',
    energy: 'medium',
    task: 'Meetings & Communication',
    notes: 'Team sync and client calls',
    recurring_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    user_id: 'user-1',
    block: 'night',
    start_time: '18:00',
    end_time: '22:00',
    energy: 'low',
    task: 'Planning & Review',
    notes: 'Review day and plan tomorrow',
    recurring_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    created_at: new Date().toISOString()
  }
];

export async function GET() {
  try {
    // TODO: Get user ID from Supabase auth
    // const userId = 'user-1'; // Mock user ID
    
    // TODO: Replace with actual Supabase query
    // const { data, error } = await supabase
    //   .from('schedules')
    //   .select('*')
    //   .eq('user_id', userId);
    
    // Mock response
    const userSchedules = mockSchedules.filter(s => s.user_id === 'user-1');
    
    // Group by block
    const schedulesByBlock = userSchedules.reduce((acc, schedule) => {
      acc[schedule.block] = schedule;
      return acc;
    }, {} as Record<string, Schedule>);

    const response: ApiResponse<Record<string, Schedule>> = {
      ok: true,
      data: schedulesByBlock
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    
    const response: ApiResponse = {
      ok: false,
      error: 'Failed to fetch schedules'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Validate request body with zod
    if (!body || !Array.isArray(body)) {
      const response: ApiResponse = {
        ok: false,
        error: 'Invalid request body. Expected array of schedules.'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // TODO: Get user ID from Supabase auth
    // const userId = 'user-1'; // Mock user ID
    
    // TODO: Validate each schedule
    for (const schedule of body) {
      if (!schedule.block || !schedule.start_time || !schedule.end_time || !schedule.energy) {
        const response: ApiResponse = {
          ok: false,
          error: 'Missing required fields: block, start_time, end_time, energy'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // TODO: Replace with actual Supabase upsert
    // const { data, error } = await supabase
    //   .from('schedules')
    //   .upsert(body.map(schedule => ({
    //     ...schedule,
    //     user_id: userId,
    //     updated_at: new Date().toISOString()
    //   })));

    // Mock success response
    const response: ApiResponse = {
      ok: true,
      data: { message: 'Schedules saved successfully' }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving schedules:', error);
    
    const response: ApiResponse = {
      ok: false,
      error: 'Failed to save schedules'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
