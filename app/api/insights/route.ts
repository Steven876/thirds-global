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
  // Task completion velocity and windows
  completionVelocity: {
    byHour: Array<{ hour: number; completed: number; avgDuration: number }>; // hour: 0-23
    fastestHour?: number; // smallest avg duration with a minimum sample size
    fastestAvg?: number;
    highestThroughputHour?: number; // most completed tasks per hour
  };
  highBlock?: { start: string; end: string } | null;
}

type Proposal = {
  type: 'shift_high_block';
  target: { start: string; end: string };
  rationale: string;
};

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
    let proposals: Proposal[] = [];
    let motivation: string | undefined = undefined;
    try {
      suggestions = await generateAISuggestions(userDataSummary);
      const p = generateScheduleProposals(userDataSummary);
      proposals = p;
      motivation = await generateMotivationalMessage(userDataSummary);
    } catch (aiError) {
      console.warn('AI service failed, falling back to rule-based suggestions:', aiError);
      suggestions = generateRuleBasedSuggestions(userDataSummary);
      proposals = generateScheduleProposals(userDataSummary);
      motivation = generateRuleBasedMotivation(userDataSummary);
    }

    const response: ApiResponse<InsightsResponse> = {
      ok: true,
      data: { suggestions, proposals, motivation }
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

// Allow applying proposals to update the user's schedule template
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseFromRequest(request);
    const body = await request.json();
    const { type, target } = body || {};

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });

    if (type !== 'shift_high_block' || !target?.start || !target?.end) {
      return NextResponse.json({ ok: false, error: 'Invalid proposal payload' }, { status: 400 });
    }

    // Upsert the High energy template for this user
    const { data: existing } = await supabase
      .from('session_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('energy_type', 'High')
      .limit(1)
      .maybeSingle();

    // Fetch current other blocks
    const { data: others } = await supabase
      .from('session_templates')
      .select('id, energy_type, start_time, end_time')
      .eq('user_id', user.id);

    // Helper to minutes
    const toMin = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
    const fromMin = (m: number) => `${String(Math.floor((m+1440)%1440/60)).padStart(2,'0')}:${String((m+1440)%60).padStart(2,'0')}`;

    // Desired High window
    let hS = toMin(target.start);
    let hE = toMin(target.end);
    if (hE <= hS) hE = hS + 60; // enforce at least 1h

    // Adjust others to avoid overlaps (simple linear ordering High->Medium->Low)
    const medium = others?.find((o:any)=> o.energy_type==='Medium');
    const low = others?.find((o:any)=> o.energy_type==='Low');

    // Write High first
    if (existing?.id) {
      const { error: updErr } = await supabase.from('session_templates').update({ start_time: fromMin(hS), end_time: fromMin(hE) }).eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('session_templates').insert({ user_id: user.id, energy_type: 'High', start_time: fromMin(hS), end_time: fromMin(hE) });
      if (insErr) throw insErr;
    }

    // Clamp Medium after High
    if (medium) {
      let mS = toMin(medium.start_time);
      let mE = toMin(medium.end_time);
      if (mS < hE) { mS = hE; }
      if (mE <= mS) mE = mS + 60;
      const { error } = await supabase.from('session_templates').update({ start_time: fromMin(mS), end_time: fromMin(mE) }).eq('id', medium.id);
      if (error) throw error;
    }

    // Clamp Low after Medium/High
    if (low) {
      const midRef = medium ? toMin(medium.end_time) : hE;
      let lS = toMin(low.start_time);
      let lE = toMin(low.end_time);
      if (lS < midRef) { lS = midRef; }
      if (lE <= lS) lE = lS + 60;
      const { error } = await supabase.from('session_templates').update({ start_time: fromMin(lS), end_time: fromMin(lE) }).eq('id', low.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Failed to apply proposal' }, { status: 500 });
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

  // Determine current High energy block window (if any)
  const { data: highBlockTemplate } = await supabase
    .from('session_templates')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .eq('energy_type', 'High')
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

  // Completion velocity by hour
  const byHourMap: Record<number, { completed: number; totalDuration: number }> = {};
  sessions.forEach((session: any) => {
    const tasks = session.tasks || [];
    const startHour = parseInt((session.session_templates?.start_time || '0:0').toString().split(':')[0], 10) || 0;
    const completed = tasks.filter((t: any) => t.status === 'completed');
    const totalDur = completed.reduce((a: number, t: any) => a + (t.duration_minutes || 0), 0);
    if (!byHourMap[startHour]) byHourMap[startHour] = { completed: 0, totalDuration: 0 };
    byHourMap[startHour].completed += completed.length;
    byHourMap[startHour].totalDuration += totalDur;
  });
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const row = byHourMap[h] || { completed: 0, totalDuration: 0 };
    const avg = row.completed > 0 ? row.totalDuration / row.completed : 0;
    return { hour: h, completed: row.completed, avgDuration: avg };
  });
  // Pick fastest hour with at least 3 completed tasks as a signal; else highest throughput
  const eligible = byHour.filter(h => h.completed >= 3).sort((a,b) => a.avgDuration - b.avgDuration);
  const fastestHour = eligible[0]?.hour;
  const fastestAvg = eligible[0]?.avgDuration;
  const highestThroughputHour = byHour.slice().sort((a,b)=> b.completed - a.completed)[0]?.hour;

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
    },
    completionVelocity: {
      byHour,
      fastestHour,
      fastestAvg,
      highestThroughputHour
    },
    highBlock: highBlockTemplate ? { start: highBlockTemplate.start_time, end: highBlockTemplate.end_time } : null
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
 - Completion velocity by hour: ${userData.completionVelocity.byHour.map(h=>`${h.hour}:00 → ${h.completed} completed, ${Math.round(h.avgDuration)}m avg`).join('; ')}
 - Fastest hour: ${userData.completionVelocity.fastestHour ?? 'n/a'} (avg ${Math.round(userData.completionVelocity.fastestAvg || 0)}m)
 - Highest throughput hour: ${userData.completionVelocity.highestThroughputHour ?? 'n/a'}
 - Current High energy block: ${userData.highBlock ? `${userData.highBlock.start}–${userData.highBlock.end}` : 'n/a'}

Provide personalized, actionable recommendations. Focus on:
1. Optimal scheduling based on energy patterns
2. Time management improvements
3. Consistency and habit building
4. Energy optimization strategies
 5. If completion speed is significantly better at a specific hour, recommend moving or adding a High energy block to cover that hour (justify briefly). If throughput is higher at a different hour, mention it as an alternative.

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

// Motivational message generators
async function generateMotivationalMessage(userData: UserDataSummary): Promise<string> {
  const prompt = `Write a single short motivational line (max 18 words) tailored to the user's current energy context.

Context:
- Fastest completion hour: ${userData.completionVelocity.fastestHour ?? 'n/a'} (avg ${Math.round(userData.completionVelocity.fastestAvg || 0)}m)
- Current High block: ${userData.highBlock ? `${userData.highBlock.start}–${userData.highBlock.end}` : 'n/a'}
- Last week sessions: ${userData.recentTrends.lastWeekSessions}
- Focus time last week (hours): ${Math.round(userData.recentTrends.lastWeekFocusTime / 3600)}

Tone: supportive, concise, energetic. Avoid emojis.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Return only the line, no quotes.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 40
  });
  return completion.choices[0]?.message?.content?.trim() || 'Let’s make steady progress right now.';
}

function generateRuleBasedMotivation(userData: UserDataSummary): string {
  if (userData.completionVelocity.fastestHour !== undefined) {
    return `Lean into your ${userData.completionVelocity.fastestHour}:00 momentum—keep the streak alive.`;
  }
  if (userData.recentTrends.lastWeekSessions > 0) {
    return 'Consistency compounds—today’s focus moves the needle.';
  }
  return 'Start small, finish strong.';
}

// Create concrete schedule change proposals based on focus velocity
function generateScheduleProposals(userData: UserDataSummary): Proposal[] {
  const proposals: Proposal[] = [];
  const fastestHour = userData.completionVelocity.fastestHour;
  if (typeof fastestHour === 'number') {
    // Propose a 2-hour High block centered on fastestHour when meaningful
    const startHour = Math.max(0, fastestHour - 1);
    const endHour = Math.min(23, fastestHour + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${pad(startHour)}:00`;
    const end = `${pad(endHour)}:00`;
    proposals.push({
      type: 'shift_high_block',
      target: { start, end },
      rationale: `Your fastest completion window is around ${pad(fastestHour)}:00; shifting High energy block to ${start}–${end} may improve throughput.`
    });
  }
  return proposals;
}
