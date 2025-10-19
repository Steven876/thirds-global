/**
 * Home / Dashboard Page
 * 
 * Main interface for the current day's schedule and timer.
 * Features circular timer, task list, control panel, and AI insights.
 * 
 * TODO: Connect to real-time data from Supabase
 * TODO: Add WebSocket support for live updates
 * TODO: Add keyboard shortcuts
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import ScheduleGuard from '@/components/ScheduleGuard';
import CircularTimer from '@/components/CircularTimer';
import TaskList from '@/components/TaskList';
// Control buttons will be inline here (Skip/Complete)
import AIWidget from '@/components/AIWidget';
import ErrorMessage from '@/components/ErrorMessage';
import { getCurrentBlock, getEnergyMessage, formatRange, getBlockTheme, getBlockTextColors } from '@/lib/time';
import { Pause, SkipForward, Play } from 'lucide-react';
import { EnergyLevel, TaskItem } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [currentBlock, setCurrentBlock] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('high');
  const [error, setError] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lastBlockEndMinutesState, setLastBlockEndMinutesState] = useState<number | null>(null);
  const [currentBlockRange, setCurrentBlockRange] = useState<string | null>(null);
  const [currentEnergyLabel, setCurrentEnergyLabel] = useState<'High'|'Medium'|'Low' | null>(null);

  // Mock task data
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const currentTask = tasks[currentTaskIndex]?.label || 'No task';
  const nextTask = tasks[currentTaskIndex + 1]?.label || 'All tasks complete';

  // Update current block and energy level based on time
  useEffect(() => {
    const updateCurrentBlock = () => {
      const block = getCurrentBlock();
      setCurrentBlock(block);
      
      // Set energy level based on block
      const energyMap: Record<string, EnergyLevel> = {
        morning: 'high',
        afternoon: 'medium',
        night: 'low'
      };
      setEnergyLevel(energyMap[block]);
    };

    updateCurrentBlock();
    const interval = setInterval(updateCurrentBlock, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Helpers for block end detection
  const getNowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const getBlockEndMinutes = (block: 'morning' | 'afternoon' | 'night') => {
    if (block === 'morning') return 12 * 60; // 12:00
    if (block === 'afternoon') return 18 * 60; // 18:00
    return 24 * 60 - 1; // 23:59 for night
  };

  const allTasksDone = tasks.every(t => t.done);
  const lastBlockEndMinutes = lastBlockEndMinutesState ?? 22 * 60; // fallback to 22:00 if unknown
  const isAfterLastBlockEnd = getNowMinutes() >= lastBlockEndMinutes;
  const dayEnded = allTasksDone || isAfterLastBlockEnd;
  const displayCurrentTask = dayEnded ? (allTasksDone ? 'Tasks completed' : 'Tasks have ended') : currentTask;
  const displayNextTask = dayEnded ? 'No upcoming tasks' : nextTask;

  // Load username for greeting
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase.from('users').select('username').eq('id', userId).single();
      setUsername(profile?.username ?? null);
    };
    load();
  }, []);

  // Load today's tasks from DB for the current block
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (!uid) return;
        const weekday = new Date().toLocaleString('en-US', { weekday: 'long' });
        const { data: scheduleRow } = await supabase
          .from('schedules')
          .select('id')
          .eq('user_id', uid)
          .eq('day_of_week', weekday)
          .single();
        if (!scheduleRow) { setTasks([]); return; }
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, template_id')
          .eq('schedule_id', scheduleRow.id);
        if (!sessions) { setTasks([]); return; }
        const templateIds = sessions.map(s => s.template_id);
        const { data: templates } = await supabase
          .from('session_templates')
          .select('id, energy_type, start_time, end_time')
          .in('id', templateIds);
        const tmplById: Record<number, { id:number; energy_type:'High'|'Medium'|'Low'; start_time:string; end_time:string }> = Object.fromEntries((templates||[]).map(t=>[t.id, t]));
        // compute last block end (max end among templates)
        const toMin = (t:string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
        const endMins = (templates||[]).map(t=>toMin(t.end_time)).filter(n=>!Number.isNaN(n));
        if (endMins.length) setLastBlockEndMinutesState(Math.max(...endMins));
        // pick the session matching currentBlock
        const wantedEnergy = currentBlock === 'morning' ? 'High' : currentBlock === 'afternoon' ? 'Medium' : 'Low';
        const targetSession = sessions.find(s => tmplById[s.template_id]?.energy_type === wantedEnergy);
        if (!targetSession) { setTasks([]); return; }
        const tmpl = tmplById[targetSession.template_id];
        setCurrentBlockRange(formatRange(tmpl.start_time.slice(0,5), tmpl.end_time.slice(0,5)));
        setCurrentEnergyLabel(tmpl.energy_type);
        const { data: dbTasks } = await supabase
          .from('tasks')
          .select('id, name, description, duration_minutes, status')
          .eq('session_id', targetSession.id)
          .order('id', { ascending: true });
        const energyMap = { High: 'high', Medium: 'medium', Low: 'low' } as const;
        const mapped: TaskItem[] = (dbTasks||[]).map(t => ({
          id: t.id,
          label: t.name,
          range: formatRange(tmpl.start_time.slice(0,5), tmpl.end_time.slice(0,5)),
          energy: energyMap[tmpl.energy_type],
          done: t.status === 'completed',
          status: t.status as any
        }));
        setTasks(mapped);
        setCurrentTaskIndex(0);
      } catch (e) {
        console.error('Failed to load tasks', e);
        setTasks([]);
      }
    };
    loadTasks();
  }, [currentBlock]);

  // Timer countdown with freeze/pause conditions
  useEffect(() => {
    if (isTimerFrozen || isPaused) return; // do not tick when frozen/paused
    if (allTasksDone || isAfterLastBlockEnd) {
      setTimeRemaining(0);
      setIsTimerFrozen(true);
      return;
    }

    const tick = () => {
      const nowMin = getNowMinutes();
      const endMin = getBlockEndMinutes(currentBlock);
      if (nowMin >= endMin || nowMin >= lastBlockEndMinutes) {
        setTimeRemaining(0);
        setIsTimerFrozen(true);
        return;
      }
      setTimeRemaining(prev => (prev <= 0 ? 0 : prev - 1));
    };

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentBlock, isTimerFrozen, isPaused, allTasksDone, isAfterLastBlockEnd]);

  const handleTaskComplete = () => {
    setTimeRemaining(25 * 60); // Reset timer
    // TODO: Mark task as completed in database
    console.log('Task completed!');
  };

  const updateCurrentTaskStatus = async (status: 'completed' | 'skipped') => {
    try {
      const current = tasks[currentTaskIndex];
      if (!current?.id) return; // demo tasks may not have ids yet

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: current.id, status })
      });
    } catch (e) {
      console.error('Failed to update task status', e);
    }
  };

  const handleSkip = async () => {
    await updateCurrentTaskStatus('skipped');
    setTasks(prev => prev.map((t, i) => i === currentTaskIndex ? { ...t, done: true, status: 'skipped' } : t));
    const nextIndex = Math.min(currentTaskIndex + 1, tasks.length - 1);
    setCurrentTaskIndex(nextIndex);
    setTimeRemaining(25 * 60);
    if (currentTaskIndex + 1 >= tasks.length) {
      setTimeRemaining(0);
      setIsTimerFrozen(true);
    }
  };

  const handleComplete = async () => {
    await updateCurrentTaskStatus('completed');
    setTasks(prev => prev.map((t, i) => i === currentTaskIndex ? { ...t, done: true, status: 'completed' } : t));
    const nextIndex = Math.min(currentTaskIndex + 1, tasks.length - 1);
    setCurrentTaskIndex(nextIndex);
    setTimeRemaining(25 * 60);
    if (currentTaskIndex + 1 >= tasks.length) {
      setTimeRemaining(0);
      setIsTimerFrozen(true);
    }
  };

  const handlePauseToggle = () => {
    if (isTimerFrozen) return;
    setIsPaused(p => !p);
  };

  const textColors = getBlockTextColors(currentBlock);

  return (
    <AuthGuard>
    <ScheduleGuard>
    <div className={`min-h-screen gradient-transition animated-gradient ${getBlockTheme(currentBlock)} relative overflow-hidden`}>
      <div className="grain-overlay"></div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Header Section with time-based greeting (no header bar) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className={`text-4xl font-bold ${textColors.primary} mb-2`}>
            Good {currentBlock === 'morning' ? 'Morning' : currentBlock === 'afternoon' ? 'Afternoon' : 'Night'}{username ? `, ${username}` : ''}!
          </h1>
          <p className={`text-lg ${textColors.secondary} mb-4`}>
            {getEnergyMessage(energyLevel)}
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/60 rounded-lg backdrop-blur-sm shadow-sm">
            <span className="text-sm font-medium text-gray-700">Current Block:</span>
            <span className="text-sm font-semibold text-gray-900">
              {isAfterLastBlockEnd ? 'All blocks completed' : (currentEnergyLabel || (energyLevel.charAt(0).toUpperCase()+energyLevel.slice(1)))}{!isAfterLastBlockEnd && currentBlockRange ? ` • ${currentBlockRange}` : ''}
            </span>
          </div>
        </motion.div>

        {/* Centered Timer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center justify-center"
        >
          {/* Current Task above */}
          <div className="text-center mb-4">
            <div className={`text-sm ${textColors.secondary}`}>Current task</div>
            <div className={`text-xl font-semibold ${textColors.primary}`}>{displayCurrentTask}</div>
          </div>

          {/* Timer (no white background) */}
          <div className="rounded-full">
            <CircularTimer
              currentTask={currentTask}
              timeRemainingSec={timeRemaining}
              energyLevel={energyLevel}
              onComplete={handleTaskComplete}
            />
          </div>

          {/* Next Task below */}
          <div className="text-center mt-6">
            <div className={`text-xs ${textColors.secondary}`}>Next</div>
            <div className={`text-lg font-medium ${textColors.primary}`}>{displayNextTask}</div>
          </div>

          {/* Controls: Pause / Skip / Continue (icons) */}
          <div className="mt-8 flex items-center gap-6">
            <button onClick={handlePauseToggle} className="h-12 w-12 rounded-full bg-white/70 backdrop-blur-sm border border-white/30 flex items-center justify-center text-slate-900 hover:bg-white" aria-label="Pause/Resume">
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            <button onClick={handleSkip} className="h-12 w-12 rounded-full bg-white/70 backdrop-blur-sm border border-white/30 flex items-center justify-center text-slate-900 hover:bg-white" aria-label="Skip">
              <SkipForward className="h-5 w-5" />
            </button>
            <button onClick={()=>{ if (isTimerFrozen){ setIsTimerFrozen(false); } setIsPaused(false); }} className="h-12 w-12 rounded-full bg-white/70 backdrop-blur-sm border border-white/30 flex items-center justify-center text-slate-900 hover:bg-white" aria-label="Continue">
              <Play className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Hidden task list for now; can add below if needed */}
      </main>

      {/* Floating AI insights panel now shows today's tasks first */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white/30 backdrop-blur-[1px] shadow-2xl border-l border-white/20 transform transition-transform duration-300 ease-in-out z-40 ${insightsOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e)=> e.stopPropagation()}>
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900">AI Insights</span>
          <button className="ml-auto text-gray-500 hover:text-gray-700" onClick={() => setInsightsOpen(false)}>Close</button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Today's Tasks</h3>
            <ul className="space-y-2">
              {tasks.map((t, idx) => (
                <li
                  key={idx}
                  className={`flex items-start justify-between rounded-lg border p-3 ${
                    t.energy === 'high'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : t.energy === 'medium'
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-rose-200 bg-rose-50/70'
                  }`}
                >
                  <div className="mr-3">
                    <div className="text-sm font-medium text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-600">{t.range}</div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : t.status === 'skipped'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status === 'completed' ? 'Completed' : t.status === 'skipped' ? 'Skipped' : 'Active'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <AIWidget />
        </div>
      </div>

      {/* Floating menu button to open insights */}
      {!insightsOpen && (
        <button
          onClick={() => setInsightsOpen(true)}
          className="fixed top-4 right-4 z-40 text-white hover:opacity-80 transition-opacity p-2"
          aria-label="Open menu"
        >
          <span className="sr-only">Open insights</span>
          {/* Three-dot icon (no circle background) */}
          <div className="flex items-center justify-center space-x-1.5">
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
          </div>
        </button>
      )}
      {insightsOpen && (
        <div className="fixed inset-0 z-30" onClick={()=> setInsightsOpen(false)} />
      )}
    </div>
    </ScheduleGuard>
    </AuthGuard>
  );
}
