/**
 * Insights API Route
 * 
 * Provides AI-powered insights and recommendations based on user session data.
 * Fetches user's historical data and generates personalized suggestions using OpenAI.
 * Falls back to rule-based suggestions if AI service is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabaseClient';
import { ApiResponse, InsightsResponse } from '@/lib/types';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserDataSummary {
  totalSessions: number;
  totalFocusTime: number;
  averageSessionDuration: number;
  completionRate: number;
  energyLevelPatterns: {
    high: { count: number; avgDuration: number };
    medium: { count: number; avgDuration: number };
    low: { count: number; avgDuration: number };
  };
  timeOfDayPatterns: {
    morning: { sessions: number; avgDuration: number };
    afternoon: { sessions: number; avgDuration: number };
    night: { sessions: number; avgDuration: number };
  };
  recentTrends: {
    lastWeekSessions: number;
    lastWeekFocusTime: number;
    consistencyScore: number;
  };
  scheduleData: {
    wakeTime: string | null;
    sleepTime: string | null;
    hasSchedule: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseFromRequest(request);
    
    // Get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user's historical data
    const userDataSummary = await fetchUserDataSummary(supabase, userId);
    
    // Generate AI-powered insights
    let suggestions: string[] = [];
    try {
      suggestions = await generateAISuggestions(userDataSummary);
    } catch (aiError) {
      console.warn('AI service failed, falling back to rule-based suggestions:', aiError);
      suggestions = generateRuleBasedSuggestions(userDataSummary);
    }

    const response: ApiResponse<InsightsResponse> = {
      ok: true,
      data: { suggestions }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating insights:', error);
    
    const response: ApiResponse = {
      ok: false,
      error: 'Failed to generate insights'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// Fetch comprehensive user data for AI analysis
async function fetchUserDataSummary(supabase: any, userId: string): Promise<UserDataSummary> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch sessions with templates and tasks
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select(`
      *,
      session_templates!inner(energy_type, start_time, end_time, user_id),
      tasks(status, duration_minutes)
    `)
    .eq('session_templates.user_id', userId)
    .gte('created_at', oneMonthAgo);

  // Fetch schedule data
  const { data: scheduleData } = await supabase
    .from('schedules')
    .select('wake_time, sleep_time')
    .eq('user_id', userId)
    .limit(1)
    .single();

  // Fetch reports for additional insights
  const { data: reportsData } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .gte('report_date', oneWeekAgo);

  // Process session data
  const sessions = sessionsData || [];
  const totalSessions = sessions.length;
  const totalFocusTime = sessions.reduce((acc: number, session: any) => {
    const tasks = session.tasks || [];
    return acc + tasks.reduce((taskAcc: number, task: any) => {
      return taskAcc + (task.duration_minutes || 0) * 60;
    }, 0);
  }, 0);

  const completedTasks = sessions.reduce((acc: number, session: any) => {
    const tasks = session.tasks || [];
    return acc + tasks.filter((task: any) => task.status === 'completed').length;
  }, 0);

  const totalTasks = sessions.reduce((acc: number, session: any) => {
    const tasks = session.tasks || [];
    return acc + tasks.length;
  }, 0);

  // Analyze energy level patterns
  const energyLevelPatterns = {
    high: { count: 0, avgDuration: 0 },
    medium: { count: 0, avgDuration: 0 },
    low: { count: 0, avgDuration: 0 }
  };

  sessions.forEach((session: any) => {
    const energyType = session.session_templates?.energy_type?.toLowerCase();
    const tasks = session.tasks || [];
    const sessionDuration = tasks.reduce((acc: number, task: any) => acc + (task.duration_minutes || 0), 0);
    
    if (energyType && energyLevelPatterns[energyType as keyof typeof energyLevelPatterns]) {
      energyLevelPatterns[energyType as keyof typeof energyLevelPatterns].count++;
      energyLevelPatterns[energyType as keyof typeof energyLevelPatterns].avgDuration += sessionDuration;
    }
  });

  // Calculate average durations
  Object.keys(energyLevelPatterns).forEach(key => {
    const pattern = energyLevelPatterns[key as keyof typeof energyLevelPatterns];
    if (pattern.count > 0) {
      pattern.avgDuration = pattern.avgDuration / pattern.count;
    }
  });

  // Analyze time of day patterns
  const timeOfDayPatterns = {
    morning: { sessions: 0, avgDuration: 0 },
    afternoon: { sessions: 0, avgDuration: 0 },
    night: { sessions: 0, avgDuration: 0 }
  };

  sessions.forEach((session: any) => {
    const startTime = session.session_templates?.start_time;
    if (startTime) {
      const hour = parseInt(startTime.split(':')[0]);
      const tasks = session.tasks || [];
      const sessionDuration = tasks.reduce((acc: number, task: any) => acc + (task.duration_minutes || 0), 0);
      
      if (hour >= 6 && hour < 12) {
        timeOfDayPatterns.morning.sessions++;
        timeOfDayPatterns.morning.avgDuration += sessionDuration;
      } else if (hour >= 12 && hour < 18) {
        timeOfDayPatterns.afternoon.sessions++;
        timeOfDayPatterns.afternoon.avgDuration += sessionDuration;
      } else {
        timeOfDayPatterns.night.sessions++;
        timeOfDayPatterns.night.avgDuration += sessionDuration;
      }
    }
  });

  // Calculate average durations for time patterns
  Object.keys(timeOfDayPatterns).forEach(key => {
    const pattern = timeOfDayPatterns[key as keyof typeof timeOfDayPatterns];
    if (pattern.sessions > 0) {
      pattern.avgDuration = pattern.avgDuration / pattern.sessions;
    }
  });

  // Calculate recent trends
  const lastWeekSessions = sessions.filter((session: any) => 
    new Date(session.created_at) >= new Date(oneWeekAgo)
  ).length;

  const lastWeekFocusTime = sessions
    .filter((session: any) => new Date(session.created_at) >= new Date(oneWeekAgo))
    .reduce((acc: number, session: any) => {
      const tasks = session.tasks || [];
      return acc + tasks.reduce((taskAcc: number, task: any) => {
        return taskAcc + (task.duration_minutes || 0) * 60;
      }, 0);
    }, 0);

  // Calculate consistency score (simplified)
  const consistencyScore = totalSessions > 0 ? Math.min(100, (completedTasks / Math.max(totalTasks, 1)) * 100) : 0;

  return {
    totalSessions,
    totalFocusTime,
    averageSessionDuration: totalSessions > 0 ? totalFocusTime / totalSessions : 0,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    energyLevelPatterns,
    timeOfDayPatterns,
    recentTrends: {
      lastWeekSessions,
      lastWeekFocusTime,
      consistencyScore
    },
    scheduleData: {
      wakeTime: scheduleData?.wake_time || null,
      sleepTime: scheduleData?.sleep_time || null,
      hasSchedule: !!scheduleData
    }
  };
}

// Generate AI-powered suggestions using OpenAI
async function generateAISuggestions(userData: UserDataSummary): Promise<string[]> {
  const prompt = `You are a productivity coach analyzing a user's focus session data. Based on the following data summary, provide 3-6 short, actionable recommendations for schedule and energy optimization.

User Data Summary:
- Total sessions: ${userData.totalSessions}
- Total focus time: ${Math.round(userData.totalFocusTime / 3600 * 10) / 10} hours
- Average session duration: ${Math.round(userData.averageSessionDuration / 60)} minutes
- Task completion rate: ${Math.round(userData.completionRate)}%
- Energy level patterns: High (${userData.energyLevelPatterns.high.count} sessions, ${Math.round(userData.energyLevelPatterns.high.avgDuration)} min avg), Medium (${userData.energyLevelPatterns.medium.count} sessions, ${Math.round(userData.energyLevelPatterns.medium.avgDuration)} min avg), Low (${userData.energyLevelPatterns.low.count} sessions, ${Math.round(userData.energyLevelPatterns.low.avgDuration)} min avg)
- Time patterns: Morning (${userData.timeOfDayPatterns.morning.sessions} sessions, ${Math.round(userData.timeOfDayPatterns.morning.avgDuration)} min avg), Afternoon (${userData.timeOfDayPatterns.afternoon.sessions} sessions, ${Math.round(userData.timeOfDayPatterns.afternoon.avgDuration)} min avg), Night (${userData.timeOfDayPatterns.night.sessions} sessions, ${Math.round(userData.timeOfDayPatterns.night.avgDuration)} min avg)
- Recent activity: ${userData.recentTrends.lastWeekSessions} sessions this week, ${Math.round(userData.recentTrends.lastWeekFocusTime / 3600 * 10) / 10} hours focus time
- Consistency score: ${Math.round(userData.recentTrends.consistencyScore)}%
- Schedule: ${userData.scheduleData.hasSchedule ? `Wake at ${userData.scheduleData.wakeTime}, Sleep at ${userData.scheduleData.sleepTime}` : 'No schedule set'}

Provide personalized, actionable recommendations. Focus on:
1. Optimal scheduling based on energy patterns
2. Time management improvements
3. Consistency and habit building
4. Energy optimization strategies

Format as a JSON array of strings, each recommendation should be 1-2 sentences and actionable.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful productivity coach. Always respond with valid JSON arrays of strings."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  try {
    const suggestions = JSON.parse(response);
    return Array.isArray(suggestions) ? suggestions : [response];
  } catch {
    // If JSON parsing fails, split by lines and clean up
    return response.split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 6);
  }
}

// Generate rule-based fallback suggestions
function generateRuleBasedSuggestions(userData: UserDataSummary): string[] {
  const suggestions: string[] = [];

  // Focus time recommendations
  if (userData.totalFocusTime > 4 * 3600) {
    suggestions.push("You've completed 4+ hours of deep work today. Consider taking a longer break to recharge.");
  } else if (userData.totalFocusTime < 2 * 3600 && userData.totalSessions > 0) {
    suggestions.push("Try extending your focus sessions to build deeper concentration habits.");
  }

  // Energy level optimization
  const mostProductiveEnergy = Object.entries(userData.energyLevelPatterns)
    .sort(([,a], [,b]) => b.avgDuration - a.avgDuration)[0];
  
  if (mostProductiveEnergy && mostProductiveEnergy[1].count > 0) {
    suggestions.push(`Your ${mostProductiveEnergy[0]} energy sessions are most productive. Schedule important tasks during these times.`);
  }

  // Time of day patterns
  const mostProductiveTime = Object.entries(userData.timeOfDayPatterns)
    .sort(([,a], [,b]) => b.avgDuration - a.avgDuration)[0];
  
  if (mostProductiveTime && mostProductiveTime[1].sessions > 0) {
    suggestions.push(`Your ${mostProductiveTime[0]} sessions show the best focus. Consider making this your primary work time.`);
  }

  // Consistency recommendations
  if (userData.completionRate > 80) {
    suggestions.push("Excellent task completion rate! Your consistency is building strong productivity habits.");
  } else if (userData.completionRate < 50) {
    suggestions.push("Try breaking tasks into smaller chunks to improve completion rates and build momentum.");
  }

  // Schedule recommendations
  if (!userData.scheduleData.hasSchedule) {
    suggestions.push("Set up a consistent sleep and wake schedule to optimize your energy levels throughout the day.");
  }

  // Recent activity trends
  if (userData.recentTrends.lastWeekSessions < 3) {
    suggestions.push("Increase session frequency to build stronger focus habits. Aim for at least 3 sessions per week.");
  }

  // Default suggestions if no specific patterns
  if (suggestions.length === 0) {
    suggestions.push(
      "Start tracking your energy levels throughout the day to identify your most productive times.",
      "Try the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break.",
      "Schedule your most challenging tasks during your highest energy periods."
    );
  }

  return suggestions.slice(0, 6);
}
