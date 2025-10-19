/**
 * Schedule Builder Page
 * 
 * Enhanced schedule builder with multi-step modal flow.
 * Features time setup, task definition, and weekly overview.
 * 
 * TODO: Add drag-and-drop task reordering
 * TODO: Add task templates
 * TODO: Add schedule sharing
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/Skeleton';
import AIWidget from '@/components/AIWidget';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentBlock, getBlockTheme, formatRange, getEnergyThemeForNow } from '@/lib/time';
import { supabase } from '@/lib/supabaseClient';
import ErrorMessage from '@/components/ErrorMessage';
import { 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Edit, 
  Calendar,
  Zap,
  Moon,
  Square,
  Clock
} from 'lucide-react';

interface TimeBlock {
  startTime: string;
  endTime: string;
}

interface Task {
  id: string;
  name: string;
  duration: number; // in minutes
  description: string;
  repeat?: 'weekday' | 'weekend' | null;
  locked?: boolean;
}

interface EnergyBlock {
  high: TimeBlock;
  medium: TimeBlock;
  low: TimeBlock;
}

interface DaySchedule {
  times: EnergyBlock;
  tasks: {
    high: Task[];
    medium: Task[];
    low: Task[];
  };
  wakeTime: string;
  sleepTime: string;
}

interface ScheduleData {
  days: Record<string, DaySchedule>; // key is day name (Monday, Tuesday, etc.)
  repeat: {
    frequency: 'daily' | 'weekend' | 'custom';
    days: string[];
  };
}

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Status options removed; tasks only collect name/description/duration and optional repeat

export default function SchedulePage() {
  const [currentBlock, setCurrentBlock] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [energyLevel, setEnergyLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'times' | 'tasks' | 'repeat' | 'overview'>('times');
  const [currentTaskBlock, setCurrentTaskBlock] = useState<'high' | 'medium' | 'low'>('high');
  const [currentDay, setCurrentDay] = useState<string>(new Date().toLocaleString('en-US', { weekday: 'long' }));
  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync block/energy like Home page
  useState(() => {
    const update = () => {
      const block = getCurrentBlock();
      setCurrentBlock(block);
      const map: Record<string, 'high' | 'medium' | 'low'> = { morning: 'high', afternoon: 'medium', night: 'low' };
      setEnergyLevel(map[block]);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id as unknown as number);
  });

  // Initialize schedule data for all days
  const initializeScheduleData = (): ScheduleData => {
    const days: Record<string, DaySchedule> = {};
    daysOfWeek.forEach(day => {
      days[day] = {
        times: {
          high: { startTime: '06:00', endTime: '12:00' },
          medium: { startTime: '12:00', endTime: '18:00' },
          low: { startTime: '18:00', endTime: '22:00' }
        },
        tasks: {
          high: [],
          medium: [],
          low: []
        },
        wakeTime: '06:00',
        sleepTime: '22:30'
      };
    });
    return {
      days,
      repeat: {
        frequency: 'daily',
        days: []
      }
    };
  };

  const [scheduleData, setScheduleData] = useState<ScheduleData>(initializeScheduleData());
  const [savedSchedule, setSavedSchedule] = useState<ScheduleData | null>(null);
  const [dayBlocks, setDayBlocks] = useState<{
    energy: 'High' | 'Medium' | 'Low';
    sessionId: number;
    start_time: string;
    end_time: string;
    tasks: { id: number; name: string; description: string | null; duration_minutes: number | null; status: 'active' | 'completed' | 'skipped' }[];
  }[] | undefined>(undefined);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [deletePromptTaskId, setDeletePromptTaskId] = useState<number | null>(null);
  // Time edit modal state
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [timeEditEnergy, setTimeEditEnergy] = useState<'High'|'Medium'|'Low'|null>(null);
  const [timeEditStart, setTimeEditStart] = useState<string>('');
  const [timeEditEnd, setTimeEditEnd] = useState<string>('');
  const [timeEditError, setTimeEditError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [originalScheduleData, setOriginalScheduleData] = useState<ScheduleData | null>(null);
  // Quick add inputs for tasks modal
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskDuration, setNewTaskDuration] = useState<number | ''>('');
  const [newTaskError, setNewTaskError] = useState<string | null>(null);
  // Duration overfill popup state
  const [showDurationOverfill, setShowDurationOverfill] = useState<{ open: boolean; block: 'High'|'Medium'|'Low'|null } | null>(null);
  const [shakeTaskId, setShakeTaskId] = useState<number | string | null>(null);

  const getCurrentBlockRemaining = (): number => {
    const currentDayData = scheduleData.days[currentDay];
    const times = currentDayData.times[currentTaskBlock];
    const total = getBlockDuration(times.startTime, times.endTime);
    const used = currentDayData.tasks[currentTaskBlock].reduce((sum, t) => sum + t.duration, 0);
    return Math.max(0, total - used);
  };

  // Calculate block duration in minutes
  const getBlockDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  // Validate times for current day (end must be after start; no overnight)
  const validateTimes = (): boolean => {
    const currentDayData = scheduleData.days[currentDay];
    const { high, medium, low } = currentDayData.times;
    
    // Check if times are valid
    if (!high.startTime || !high.endTime || !medium.startTime || !medium.endTime || !low.startTime || !low.endTime) {
      setError('Please fill in all time fields');
      return false;
    }

    // 24h HH:MM minute-based comparisons
    const toMin = (t: string) => {
      if (!t) return NaN;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const hS = toMin(high.startTime), hE = toMin(high.endTime);
    const mS = toMin(medium.startTime), mE = toMin(medium.endTime);
    const lS = toMin(low.startTime), lE = toMin(low.endTime);

    if ([hS, hE, mS, mE, lS, lE].some(n => Number.isNaN(n))) {
      setError('Please enter valid times in HH:MM format');
      return false;
    }

    // Enforce end strictly after start (no overnight wraps)
    if (!(hE > hS) || !(mE > mS) || !(lE > lS)) {
      setError('End time must be after start time for each block');
      return false;
    }

    return true;
  };

  const hasOverlapSimple = (times: { high: TimeBlock; medium: TimeBlock; low: TimeBlock }): boolean => {
    const toMin = (t:string)=>{ const [h,m] = t.split(':').map(Number); return h*60+m; };
    const hS = toMin(times.high.startTime), hE = toMin(times.high.endTime);
    const mS = toMin(times.medium.startTime), mE = toMin(times.medium.endTime);
    const lS = toMin(times.low.startTime), lE = toMin(times.low.endTime);
    const overlap = (aS:number,aE:number,bS:number,bE:number)=> (aS < bE && bS < aE);
    return overlap(hS,hE,mS,mE) || overlap(hS,hE,lS,lE) || overlap(mS,mE,lS,lE);
  };

  const autoAdjustContinuous = (times: { high: TimeBlock; medium: TimeBlock; low: TimeBlock }): { high: TimeBlock; medium: TimeBlock; low: TimeBlock } => {
    const toMin = (t:string)=>{ const [h,m] = t.split(':').map(Number); return h*60+m; };
    const fromMin = (x:number)=> `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;
    const dur = (s:number,e:number)=> Math.max(1, e - s);
    let hS = toMin(times.high.startTime), hE = toMin(times.high.endTime);
    let mS = toMin(times.medium.startTime), mE = toMin(times.medium.endTime);
    let lS = toMin(times.low.startTime), lE = toMin(times.low.endTime);
    const mDur = dur(mS,mE), lDur = dur(lS,lE);
    if (mS < hE) mS = hE; mE = mS + mDur;
    if (lS < mE) lS = mE; lE = lS + lDur;
    return {
      high: { startTime: fromMin(hS), endTime: fromMin(hE) },
      medium: { startTime: fromMin(mS), endTime: fromMin(mE) },
      low: { startTime: fromMin(lS), endTime: fromMin(lE) }
    };
  };

  // Adjust nearest adjacent blocks when a single block is changed to prevent overlaps
  const adjustAdjacentForChange = (
    base: { high: TimeBlock; medium: TimeBlock; low: TimeBlock },
    changed: 'High'|'Medium'|'Low',
    startTime: string,
    endTime: string
  ): { high: TimeBlock; medium: TimeBlock; low: TimeBlock } => {
    const toMin = (t:string)=>{ const [h,m]=t.split(':').map(Number); return h*60+m; };
    const fromMin = (x:number)=> `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;
    const res = JSON.parse(JSON.stringify(base)) as { high: TimeBlock; medium: TimeBlock; low: TimeBlock };
    // Set changed
    const key = changed.toLowerCase() as 'high'|'medium'|'low';
    res[key] = { startTime, endTime };

    const hS = toMin(res.high.startTime), hE = toMin(res.high.endTime);
    let mS = toMin(res.medium.startTime), mE = toMin(res.medium.endTime);
    let lS = toMin(res.low.startTime), lE = toMin(res.low.endTime);

    // Maintain chronological order High -> Medium -> Low by clamping adjacent edges
    // Fix overlap with High↔Medium
    if (hE > mS) {
      if (changed === 'High') {
        // pull Medium start to High end
        mS = hE;
      } else {
        // push High end back to Medium start
        // ensure at least 1 minute duration
        const newHE = Math.max(hS + 1, mS);
        res.high.endTime = fromMin(newHE);
      }
    }
    // Apply Medium start update
    res.medium.startTime = fromMin(mS);
    // Recompute overlap after any change
    const newHE2 = toMin(res.high.endTime);
    mS = toMin(res.medium.startTime);
    // Ensure Medium end > start
    if (mE <= mS) mE = mS + 1;

    // Fix overlap with Medium↔Low
    if (mE > lS) {
      if (changed === 'Medium') {
        lS = mE;
      } else if (changed === 'Low') {
        mE = Math.max(mS + 1, lS);
      } else {
        // changed High -> keep Medium then move Low start if needed
        lS = Math.max(lS, mE);
      }
    }

    // Apply results
    res.medium.endTime = fromMin(mE);
    res.low.startTime = fromMin(lS);
    if (lE <= lS) lE = lS + 1;
    res.low.endTime = fromMin(lE);
    // Ensure High end consistent
    res.high.endTime = fromMin(newHE2);
    return res;
  };

  const applyTemplateTimesToBackend = async (updated: { high: TimeBlock; medium: TimeBlock; low: TimeBlock }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      // Update three templates by energy_type
      await supabase.from('session_templates').update({ start_time: updated.high.startTime, end_time: updated.high.endTime }).eq('user_id', uid).eq('energy_type', 'High');
      await supabase.from('session_templates').update({ start_time: updated.medium.startTime, end_time: updated.medium.endTime }).eq('user_id', uid).eq('energy_type', 'Medium');
      await supabase.from('session_templates').update({ start_time: updated.low.startTime, end_time: updated.low.endTime }).eq('user_id', uid).eq('energy_type', 'Low');
    } catch (e) { console.error('Failed to update templates', e); }
  };

  // Validate tasks for current block and day
  const validateTasks = (): boolean => {
    const currentDayData = scheduleData.days[currentDay];
    const currentTasks = currentDayData.tasks[currentTaskBlock];
    const currentTimes = currentDayData.times[currentTaskBlock];
    const blockDuration = getBlockDuration(currentTimes.startTime, currentTimes.endTime);
    const totalTaskDuration = currentTasks.reduce((sum, task) => sum + task.duration, 0);

    if (totalTaskDuration > blockDuration) {
      console.log('[DurationValidation] Builder save blocked:', { block: currentTaskBlock, totalTaskDuration, blockDuration });
      setShowDurationOverfill({ open: true, block: (currentTaskBlock === 'high' ? 'High' : currentTaskBlock === 'medium' ? 'Medium' : 'Low') });
      return false;
    }

    return true;
  };

  // Validate proposed duration change for DB-backed edit (BlocksView)
  const validateDbEditDuration = (energy: 'High'|'Medium'|'Low', taskId: number, proposedMinutes: number): boolean => {
    try {
      if (!Array.isArray(dayBlocks)) return true; // nothing to validate against
      const toKey = (e:'High'|'Medium'|'Low') => (e==='High'?'high':e==='Medium'?'medium':'low') as 'high'|'medium'|'low';
      const key = toKey(energy);
      const times = scheduleData.days[currentDay].times[key];
      const blockDuration = getBlockDuration(times.startTime, times.endTime);
      const block = dayBlocks.find(b => b.energy === energy);
      if (!block) return true;
      const otherSum = block.tasks.reduce((acc, t) => acc + (t.id === taskId ? 0 : (t.duration_minutes || 0)), 0);
      const total = otherSum + Math.max(0, proposedMinutes);
      console.log('[DurationValidation] DB edit check:', { energy, taskId, proposedMinutes, otherSum, total, blockDuration });
      if (total > blockDuration) {
        setShowDurationOverfill({ open: true, block: energy });
        return false;
      }
      return true;
    } catch (e) {
      console.warn('validateDbEditDuration failed:', e);
      return true;
    }
  };

  // Validate at least one task exists in ANY energy block
  const hasAtLeastOneTask = (): boolean => {
    const dayData = scheduleData.days[currentDay];
    return (
      dayData.tasks.high.length > 0 ||
      dayData.tasks.medium.length > 0 ||
      dayData.tasks.low.length > 0
    );
  };

  // Add new task
  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      name: '',
      duration: 30,
      description: '',
      repeat: null,
      locked: false
    };

    setScheduleData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: {
            ...prev.days[currentDay].tasks,
            [currentTaskBlock]: [...prev.days[currentDay].tasks[currentTaskBlock], newTask]
          }
        }
      }
    }));
  };

  // Update task
  const updateTask = (taskId: string, field: keyof Task, value: string | number | boolean | null) => {
    setScheduleData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: {
            ...prev.days[currentDay].tasks,
            [currentTaskBlock]: prev.days[currentDay].tasks[currentTaskBlock].map(task =>
              task.id === taskId ? { ...task, [field]: value } : task
            )
          }
        }
      }
    }));
  };

  // Remove task
  const removeTask = (taskId: string) => {
    setScheduleData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [currentDay]: {
          ...prev.days[currentDay],
          tasks: {
            ...prev.days[currentDay].tasks,
            [currentTaskBlock]: prev.days[currentDay].tasks[currentTaskBlock].filter(task => task.id !== taskId)
          }
        }
      }
    }));
  };

  // Apply times to selected days based on repeat settings
  const applyTimesToSelectedDays = (times: EnergyBlock) => {
    // Copy to every day of the week unconditionally
    setScheduleData(prev => {
      const newDays = { ...prev.days };
      daysOfWeek.forEach(day => {
        newDays[day] = {
          ...newDays[day],
          times: { ...times }
        };
      });
      return { ...prev, days: newDays };
    });
  };

  // Get selected days based on repeat settings
  const getSelectedDays = (): string[] => {
    const { frequency, days } = scheduleData.repeat;
    
    switch (frequency) {
      case 'daily':
        return daysOfWeek;
      case 'weekend':
        return ['Saturday', 'Sunday'];
      case 'custom':
        return days;
      default:
        return [currentDay];
    }
  };

  // Save times and apply to selected days
  const handleSaveTimes = () => {
    if (!validateTimes()) return;
    
    let currentTimes = scheduleData.days[currentDay].times;
    if (hasOverlapSimple(currentTimes)) {
      const ok = window.confirm('Your blocks overlap. Auto-adjust the other blocks to remove overlaps and keep times continuous?');
      if (!ok) { setError('Please resolve overlaps or allow auto-adjust.'); return; }
      const adjusted = autoAdjustContinuous(currentTimes);
      setScheduleData(prev => ({
        ...prev,
        days: {
          ...prev.days,
          [currentDay]: { ...prev.days[currentDay], times: adjusted }
        }
      }));
      currentTimes = adjusted;
    }

    applyTimesToSelectedDays(currentTimes);
    
    setSuccess('Block times updated across all selected days.');
    setTimeout(() => setSuccess(null), 3000);
    setCurrentStep('tasks');
  };

  // Save tasks for current block
  const handleSaveTasks = () => {
    if (!validateTasks()) return;
    setSuccess('Tasks saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Save entire schedule with repeat expansion
  const handleSaveSchedule = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token for API routes (RLS)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const userId = sessionData.session?.user?.id;
      if (!token || !userId) {
        throw new Error('You must be signed in to save a schedule.');
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } as const;

      // Immediately hide the modal for a faster-feeling flow
      setShowModal(false);

      // Expand tasks according to repeat selection
      const selectedDays = getSelectedDays();

      // Map frontend status to backend TaskStatus
      const mapStatus = (): 'active' | 'completed' | 'skipped' => 'active';

      // Build promises per day to run in parallel
      const perDayPromises = selectedDays.map(async (day) => {
        const dayData = scheduleData.days[day];
        const sessionsPayload = [
          { energy_type: 'High', start_time: dayData.times.high.startTime, end_time: dayData.times.high.endTime },
          { energy_type: 'Medium', start_time: dayData.times.medium.startTime, end_time: dayData.times.medium.endTime },
          { energy_type: 'Low', start_time: dayData.times.low.startTime, end_time: dayData.times.low.endTime }
        ];

        const scheduleRes = await fetch('/api/schedule', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            user_id: userId,
            day_of_week: day,
            sleep_time: dayData.sleepTime,
            wake_time: dayData.wakeTime,
            sessions: sessionsPayload
          })
        });
        const scheduleJson = await scheduleRes.json();
        if (!scheduleRes.ok || !scheduleJson?.ok) {
          throw new Error(scheduleJson?.error || 'Failed to create schedule.');
        }

        const sessionIds: number[] = scheduleJson.data.session_ids;
        const blockToSessionId: Record<'high' | 'medium' | 'low', number> = {
          high: sessionIds[0],
          medium: sessionIds[1],
          low: sessionIds[2]
        };

        // Create tasks under corresponding sessions (from the 'currentDay' blueprint) in parallel
        const source = scheduleData.days[currentDay];
        const taskRequests: Promise<Response>[] = [];
        (['high','medium','low'] as const).forEach((block) => {
          source.tasks[block].forEach((task) => {
            if (!task.name) return;
            taskRequests.push(
              fetch('/api/sessions', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                  session_id: blockToSessionId[block],
                  name: task.name,
                  description: task.description || null,
                  duration_minutes: task.duration,
                  status: mapStatus()
                })
              })
            );
          });
        });
        await Promise.all(taskRequests);
      });

      await Promise.all(perDayPromises);
      
      setSavedSchedule(scheduleData);
      setCurrentStep('overview');
      setSuccess('Schedule saved successfully!');
      setTimeout(() => setSuccess(null), 2000);
      await loadTodayBlocks();
    } catch {
      setError('Failed to save schedule. Please try again.');
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Cancel modal with confirmation
  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  // Confirm cancel
  const handleConfirmCancel = () => {
    if (originalScheduleData) {
      setScheduleData(originalScheduleData);
    }
    setShowModal(false);
    setShowCancelConfirm(false);
    setSuccess('Changes discarded.');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Cancel cancel confirmation
  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  // Edit schedule
  const handleEditSchedule = () => {
    setOriginalScheduleData(scheduleData);
    setCurrentStep('times');
    setShowModal(true);
  };

  // Modal content based on current step
  const renderModalContent = () => {
    switch (currentStep) {
      case 'times':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Your Energy Block Times</h2>
              <p className="text-gray-600">These times will be applied to every day of the week</p>
            </div>

            <div className="space-y-6">
              {Array.isArray(dayBlocks) && dayBlocks.length > 0 && (
                <div className="rounded-xl p-3 border border-white/30 bg-white/60 backdrop-blur-sm text-sm text-gray-800">
                  Block times are fixed based on your initial setup. Use AI recommendations in Reports to adjust for productivity.
                </div>
              )}
              {(['high','medium','low'] as const).map((blockKey) => {
                const times = scheduleData.days[currentDay].times[blockKey];
                const locked = Array.isArray(dayBlocks) && dayBlocks.length > 0;
                return (
                  <div key={blockKey} className="rounded-xl p-4 border border-white/30 bg-white/60 backdrop-blur-sm shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                      {blockKey} Energy Block
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={times.startTime}
                        onChange={(e) => setScheduleData(prev => ({
                          ...prev,
                          days: {
                            ...prev.days,
                            [currentDay]: {
                              ...prev.days[currentDay],
                              times: {
                                ...prev.days[currentDay].times,
                                  [blockKey]: { ...times, startTime: e.target.value }
                              }
                            }
                          }
                        }))}
                          disabled={locked}
                          className={`w-full px-3 py-2 ${locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 text-gray-900'} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={times.endTime}
                        onChange={(e) => setScheduleData(prev => ({
                          ...prev,
                          days: {
                            ...prev.days,
                            [currentDay]: {
                              ...prev.days[currentDay],
                              times: {
                                ...prev.days[currentDay].times,
                                  [blockKey]: { ...times, endTime: e.target.value }
                              }
                            }
                          }
                        }))}
                          disabled={locked}
                          className={`w-full px-3 py-2 ${locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 text-gray-900'} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleCancel}
                className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
              >
                <span>Cancel</span>
              </button>
              <button
                onClick={() => {
                  const hasExisting = Array.isArray(dayBlocks) && dayBlocks.length > 0;
                  if (hasExisting) { setCurrentStep('tasks'); return; }
                  handleSaveTimes();
                }}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Save className="h-4 w-4" />
                <span>Next</span>
              </button>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Define Your Tasks</h2>
              <p className="text-gray-600">Add tasks for each energy block</p>
            </div>

            {/* Block Navigation pill */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setCurrentTaskBlock(prev => prev === 'high' ? 'low' : prev === 'medium' ? 'high' : 'medium')}
                  className="px-2 py-2 rounded-lg text-slate-900 hover:text-slate-700"
                  aria-label="Previous block"
                >
                  ‹
                </button>
                <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border ${
                  currentTaskBlock==='high' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  currentTaskBlock==='medium' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    {currentTaskBlock==='high' ? <Zap className="h-4 w-4"/> : currentTaskBlock==='medium' ? <Square className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
                  </span>
                  <span className="font-medium capitalize">{currentTaskBlock} Energy</span>
            </div>
                <button
                  onClick={() => setCurrentTaskBlock(prev => prev === 'high' ? 'medium' : prev === 'medium' ? 'low' : 'high')}
                  className="px-2 py-2 rounded-lg text-slate-900 hover:text-slate-700"
                  aria-label="Next block"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Quick add row */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e)=>{
                    setNewTaskName(e.target.value);
                  }}
                  placeholder="Enter task name"
                  className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  type="number"
                  value={newTaskDuration}
                  onChange={(e)=>{
                    const v = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0);
                    setNewTaskDuration(v);
                    if (v === '') { setNewTaskError(null); return; }
                    const remaining = getCurrentBlockRemaining();
                    if (typeof v === 'number' && v > remaining) {
                      setNewTaskError(`Duration exceeds remaining time by ${v - remaining} min`);
                    } else {
                      setNewTaskError(null);
                    }
                  }}
                  placeholder="Minutes"
                  min={1}
                  className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  onClick={() => {
                    if (!newTaskName || !newTaskDuration) return;
                    const remaining = getCurrentBlockRemaining();
                    const dur = typeof newTaskDuration === 'number' ? newTaskDuration : parseInt(String(newTaskDuration)) || 0;
                    if (dur > remaining) {
                      setNewTaskError(`Duration exceeds remaining time by ${dur - remaining} min`);
                      return;
                    }
                    const newTask: Task = {
                      id: Date.now().toString(),
                      name: newTaskName,
                      duration: dur,
                      description: '',
                      repeat: null,
                      locked: false,
                    };
                    setScheduleData(prev => ({
                      ...prev,
                      days: {
                        ...prev.days,
                        [currentDay]: {
                          ...prev.days[currentDay],
                          tasks: {
                            ...prev.days[currentDay].tasks,
                            [currentTaskBlock]: [...prev.days[currentDay].tasks[currentTaskBlock], newTask]
                          }
                        }
                      }
                    }));
                    setNewTaskName('');
                    setNewTaskDuration('');
                    setNewTaskError(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  + <span>Add</span>
                </button>
              </div>
              {newTaskError && (
                <div className="md:col-span-7 text-sm text-red-600">{newTaskError}</div>
              )}
            </div>

            {/* Existing editable list (click to edit preserved) */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{currentDay}</h3>
                <div className="text-sm text-gray-600">{scheduleData.days[currentDay].tasks[currentTaskBlock].length} task(s)</div>
              </div>

              <div className="space-y-4">
                {scheduleData.days[currentDay].tasks[currentTaskBlock].map((task) => (
                  <div key={task.id} className="rounded-lg p-4 border border-white/30 bg-white/70 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => !task.locked && updateTask(task.id, 'name', e.target.value)}
                          placeholder="Enter task name"
                          className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${task.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 border border-gray-300 text-slate-900'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                        <input
                          type="number"
                          value={task.duration}
                          onChange={(e) => !task.locked && updateTask(task.id, 'duration', parseInt(e.target.value) || 0)}
                          min="1"
                          className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${task.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 border border-gray-300 text-slate-900'}`}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => updateTask(task.id, 'locked', !task.locked)}
                          className={`px-3 py-2 rounded-lg ${task.locked ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                          {task.locked ? 'Edit' : 'Save'}
                        </button>
                        <button
                          onClick={() => removeTask(task.id)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                      <textarea
                        value={task.description}
                        onChange={(e) => !task.locked && updateTask(task.id, 'description', e.target.value)}
                        placeholder="Enter task description"
                        rows={2}
                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${task.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 border border-gray-300 text-slate-900'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start items-center mt-6 text-sm text-gray-700">
                  Total duration: {scheduleData.days[currentDay].tasks[currentTaskBlock].reduce((sum, task) => sum + task.duration, 0)} minutes
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleCancel}
                className="inline-flex items-center space-x-2 px-4 py-2 text-slate-900 hover:text-slate-700 transition-colors"
              >
                <span>Cancel</span>
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('times')}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-slate-900 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => hasAtLeastOneTask() ? setCurrentStep('repeat') : setError('Add at least one task to any energy block before continuing.')}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${hasAtLeastOneTask() ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'repeat':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Repeat Frequency</h2>
              <p className="text-gray-600">Choose how often this schedule repeats</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={scheduleData.repeat.frequency === 'daily'}
                    onChange={(e) => setScheduleData(prev => ({
                      ...prev,
                      repeat: { ...prev.repeat, frequency: e.target.value as 'daily' }
                    }))}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-900">Every Day</span>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekend"
                    checked={scheduleData.repeat.frequency === 'weekend'}
                    onChange={(e) => setScheduleData(prev => ({
                      ...prev,
                      repeat: { ...prev.repeat, frequency: e.target.value as 'weekend' }
                    }))}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-900">Every Weekend</span>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="frequency"
                    value="custom"
                    checked={scheduleData.repeat.frequency === 'custom'}
                    onChange={(e) => setScheduleData(prev => ({
                      ...prev,
                      repeat: { ...prev.repeat, frequency: e.target.value as 'custom' }
                    }))}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-900">Custom Days</span>
                </label>
              </div>

              {scheduleData.repeat.frequency === 'custom' && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Select Days</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {daysOfWeek.map((day) => (
                      <label key={day} className="flex flex-col items-center space-y-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={scheduleData.repeat.days.includes(day)}
                          onChange={(e) => {
                            const newDays = e.target.checked
                              ? [...scheduleData.repeat.days, day]
                              : scheduleData.repeat.days.filter(d => d !== day);
                            setScheduleData(prev => ({
                              ...prev,
                              repeat: { ...prev.repeat, days: newDays }
                            }));
                          }}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs text-gray-700">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleCancel}
                className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
              >
                <span>Cancel</span>
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('tasks')}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Schedule</span>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Load today's blocks (sessions + tasks) from DB
  const loadTodayBlocks = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase.from('users').select('username').eq('id', uid).single();
      setUsername(profile?.username ?? null);
      const weekday = new Date().toLocaleString('en-US', { weekday: 'long' });
      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          id,
          sessions (
            id,
            template:session_templates!inner ( id, energy_type, start_time, end_time ),
            tasks ( id, name, description, duration_minutes, status )
          )
        `)
        .eq('user_id', uid)
        .eq('day_of_week', weekday)
        .single();
      if (!schedule || !schedule.sessions) { setDayBlocks([]); return; }
      const sorted = (schedule.sessions as any[])
        .map((s:any) => ({
          energy: s.template?.energy_type || 'High',
          sessionId: s.id,
          start_time: (s.template?.start_time as string) || '00:00',
          end_time: (s.template?.end_time as string) || '00:00',
          tasks: (s.tasks as any[]) || []
        }))
        .sort((a,b) => (a.energy === 'High' ? 0 : a.energy === 'Medium' ? 1 : 2) - (b.energy === 'High' ? 0 : b.energy === 'Medium' ? 1 : 2));
      setDayBlocks(sorted);

      // Prefill times with existing templates so they remain constant when editing
      if (sorted && sorted.length === 3) {
        const toHHMM = (t: string) => (t || '00:00').slice(0,5);
        const find = (e: 'High'|'Medium'|'Low') => sorted.find(b => b.energy === e);
        const high = find('High');
        const med = find('Medium');
        const low = find('Low');
        setScheduleData(prev => ({
          ...prev,
          days: {
            ...prev.days,
            [currentDay]: {
              ...prev.days[currentDay],
              times: {
                high: { startTime: toHHMM(high?.start_time || '00:00'), endTime: toHHMM(high?.end_time || '00:00') },
                medium: { startTime: toHHMM(med?.start_time || '00:00'), endTime: toHHMM(med?.end_time || '00:00') },
                low: { startTime: toHHMM(low?.start_time || '00:00'), endTime: toHHMM(low?.end_time || '00:00') }
              }
            }
          }
        }));
      }
    } catch (e) {
      console.error('Failed to load day blocks', e);
      setDayBlocks([]);
    }
  };

  useEffect(() => { loadTodayBlocks(); }, []);

          const updateTaskField = async (taskId: number, payload: Partial<{ name: string; description: string | null; duration_minutes: number | null; status: 'active'|'completed'|'skipped' }>) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: taskId, ...payload })
      });
      await loadTodayBlocks();
      setEditingTaskId(null);
    } catch (e) { console.error(e); }
  };

          const deleteTaskById = async (taskId: number) => {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              if (!token) return;
              await fetch(`/api/tasks?id=${taskId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              await loadTodayBlocks();
              setEditingTaskId(null);
            } catch (e) { console.error(e); }
          };

  const BlocksView = () => {
    if (!dayBlocks) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dayBlocks.map(block => {
          const icon = block.energy === 'High' ? <Zap className="h-5 w-5 text-emerald-700" /> : block.energy === 'Medium' ? <Square className="h-5 w-5 text-amber-700" /> : <Moon className="h-5 w-5 text-rose-700" />;
          const bg = block.energy === 'High' ? 'bg-emerald-50/70 border-emerald-200' : block.energy === 'Medium' ? 'bg-amber-50/70 border-amber-200' : 'bg-rose-50/70 border-rose-200';
          const chip = `${block.energy === 'High' ? 'text-emerald-700 bg-emerald-100/80' : block.energy === 'Medium' ? 'text-amber-700 bg-amber-100/80' : 'text-rose-700 bg-rose-100/80'} inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`;
          return (
            <div key={block.sessionId} className={`rounded-2xl p-6 backdrop-blur-sm border ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ${
                    block.energy==='High'?'bg-emerald-100': block.energy==='Medium'?'bg-amber-100':'bg-rose-100'
                  }`}>{icon}</div>
                  <div className="font-semibold text-slate-900">{block.energy} Energy</div>
                </div>
                <div className="text-xs text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                    <button
                    onClick={()=>{ setTimeEditEnergy(block.energy as any); setTimeEditStart((block.start_time||'00:00').slice(0,5)); setTimeEditEnd((block.end_time||'00:00').slice(0,5)); setShowTimeEdit(true); setTimeEditError(null); }}
                    className="hover:underline"
                    title="Edit times"
                  >
                    {formatRange((block.start_time||'00:00').slice(0,5),(block.end_time||'00:00').slice(0,5))}
                    </button>
                  </div>
                  </div>
                  
              <div className="space-y-2">
                {block.tasks.length === 0 ? (
                  <div className="rounded-xl border border-white/30 bg-white/80 p-3 text-sm text-slate-600">No tasks for this block.</div>
                ) : (
                  block.tasks.map(t => (
                    <div
                      key={t.id}
                      className={`rounded-xl border border-white/30 bg-white/80 p-3 ${editingTaskId !== t.id ? 'cursor-pointer' : ''} ${shakeTaskId===t.id ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
                      onClick={() => { if (editingTaskId !== t.id) setEditingTaskId(t.id); }}
                    >
                      {editingTaskId === t.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-800 mb-1">Task Name</label>
                            <input
                              defaultValue={t.name}
                              onBlur={(e)=>updateTaskField(t.id,{ name: e.target.value })}
                              className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900"
                              aria-label="Task name"
                            />
                      </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-800 mb-1">Description</label>
                            <textarea
                              defaultValue={t.description || ''}
                              onBlur={(e)=>updateTaskField(t.id,{ description: e.target.value || null })}
                              rows={2}
                              className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900"
                              aria-label="Task description"
                            />
                  </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-800 mb-1">Duration (min)</label>
                            <input
                              type="number"
                              defaultValue={t.duration_minutes || 0}
                              onBlur={(e)=>{
                                const val = parseInt(e.target.value)||0;
                                const ok = validateDbEditDuration(block.energy as 'High'|'Medium'|'Low', t.id, val);
                                if (!ok) {
                                  setShakeTaskId(t.id);
                                  setTimeout(()=> setShakeTaskId(null), 400);
                                  e.target.value = String(t.duration_minutes||0);
                                  return;
                                }
                                updateTaskField(t.id,{ duration_minutes: val });
                              }}
                              className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900"
                              aria-label="Task duration in minutes"
                              min={0}
                            />
                </div>
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => {
                              if (window.confirm('Delete this task?')) { deleteTaskById(t.id); }
                            }} className="px-3 py-1 text-sm text-red-600 hover:text-red-700">Delete</button>
                            <button onClick={() => setEditingTaskId(null)} className="px-3 py-1 text-sm text-slate-700">Done</button>
            </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-900 truncate max-w-[70%]">{t.name}</div>
                          <span className={chip}>{(t.duration_minutes||0)} min</span>
                </div>
                      )}
            </div>
                  ))
                )}
        </div>

              <div className="mt-6 flex items-center justify-between text-sm text-slate-700">
                <div>{block.tasks.length} {block.tasks.length === 1 ? 'task' : 'tasks'}</div>
                <div className="font-medium text-slate-900">{Math.max(0, block.tasks.reduce((a,t)=>a+(t.duration_minutes||0),0))} min total</div>
        </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AuthGuard>
    <div className={`min-h-screen gradient-transition ${
      Array.isArray(dayBlocks) && dayBlocks.length === 3
        ? getEnergyThemeForNow([
            { energy: 'High', start: dayBlocks.find(b=>b.energy==='High')?.start_time || '00:00', end: dayBlocks.find(b=>b.energy==='High')?.end_time || '00:00' },
            { energy: 'Medium', start: dayBlocks.find(b=>b.energy==='Medium')?.start_time || '00:00', end: dayBlocks.find(b=>b.energy==='Medium')?.end_time || '00:00' },
            { energy: 'Low', start: dayBlocks.find(b=>b.energy==='Low')?.start_time || '00:00', end: dayBlocks.find(b=>b.energy==='Low')?.end_time || '00:00' }
          ])
        : getBlockTheme(currentBlock)
    } relative overflow-hidden`}>
      <div className="grain-overlay"></div>
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {dayBlocks !== null ? `${username ? username + "'s" : 'Your'} Schedule` : ''}
          </h1>
        </div>
        {error && (
          <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xl px-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            {success}
          </div>
        )}

        {dayBlocks === undefined ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0,1,2].map(i => (
              <div key={i} className="rounded-2xl p-4 border border-white/30 bg-white/60 backdrop-blur-sm">
                <div className="w-32 h-5 mb-3"><Skeleton className="h-5" /></div>
                <div className="space-y-3">
                  {[0,1,2].map(j => (
                    <div key={j} className="rounded-lg border border-white/30 bg-white/80 p-3">
                      <Skeleton className="h-4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : dayBlocks.length > 0 ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setCurrentStep('tasks'); setShowModal(true); }}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/30 rounded-lg text-slate-900 hover:bg-white"
              >
                <span>Edit Schedule</span>
              </button>
            </div>
            <BlocksView />
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No tasks are scheduled for today</h2>
            <p className="text-gray-600 mb-6">Add tasks to your schedule to get started</p>
            <button
              onClick={() => {
                setScheduleData(prev => ({
                  ...prev,
                  repeat: {
                    frequency: 'custom',
                    days: Array.from(new Set([...(prev.repeat.days || []), currentDay]))
                  }
                }));
                setCurrentStep('tasks');
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Tasks</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white/40 backdrop-blur-md border border-white/30"
            >
              <div className="p-6">
                {renderModalContent()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Edit Modal */}
      <AnimatePresence>
        {showTimeEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="rounded-2xl shadow-xl max-w-md w-full bg-white/90 backdrop-blur-md border border-white/30"
            >
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Edit {timeEditEnergy || ''} Block</h3>
                  <p className="text-sm text-slate-600">Update start and end times</p>
                </div>
                {timeEditError && (
                  <div className="mb-3 text-sm text-red-600">{timeEditError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">Start Time</label>
                    <input type="time" value={timeEditStart} onChange={(e)=> setTimeEditStart(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-300 text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">End Time</label>
                    <input type="time" value={timeEditEnd} onChange={(e)=> setTimeEditEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-300 text-slate-900" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={()=> { setShowTimeEdit(false); setTimeEditEnergy(null); }} className="px-4 py-2 text-slate-700 hover:text-slate-900">Cancel</button>
                  <button
                    onClick={async ()=>{
                      if (!timeEditEnergy) return;
                      const key = timeEditEnergy.toLowerCase() as 'high'|'medium'|'low';
                      const nextTimes = { ...scheduleData.days[currentDay].times } as any;
                      // basic validation
                      const toMin = (t:string)=>{ const [h,m]=t.split(':').map(Number); return h*60+m; };
                      if (!(toMin(timeEditEnd) > toMin(timeEditStart))) { setTimeEditError('End time must be after start time.'); return; }
                      nextTimes[key] = { startTime: timeEditStart, endTime: timeEditEnd };
                      // Adjust adjacent automatically to remove overlaps
                      const adjusted = adjustAdjacentForChange({ high: nextTimes.high, medium: nextTimes.medium, low: nextTimes.low }, timeEditEnergy, timeEditStart, timeEditEnd);
                      setScheduleData(prev=>({ ...prev, days: { ...prev.days, [currentDay]: { ...prev.days[currentDay], times: adjusted } } }));
                      await applyTemplateTimesToBackend(adjusted);
                      await loadTodayBlocks();
                      setShowTimeEdit(false);
                      setTimeEditEnergy(null);
                      setSuccess('Schedule updated to prevent overlapping times.');
                      setTimeout(()=> setSuccess(null), 2000);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duration Overfill Themed Popup */}
      <AnimatePresence>
        {showDurationOverfill?.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full rounded-2xl shadow-xl bg-white/90 backdrop-blur-md border border-white/30"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Not enough time in this block</h3>
                <p className="text-slate-700 mb-4">The total duration of all tasks exceeds the available time for this energy block.</p>
                <div className="space-y-2 text-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                    <span>Change the duration of the energy block</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                    <span>Change the duration of some tasks</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                    <span>Delete some tasks from the block</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={()=> setShowDurationOverfill({ open: false, block: null })} className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Close</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Discard changes?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to discard your changes? This action cannot be undone.
                </p>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={handleCancelCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
                  >
                    No, keep editing
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Yes, discard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Slide-over (consistent with Home) */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white/40 backdrop-blur-md shadow-2xl border-l border-white/30 transform transition-transform duration-300 ease-in-out z-40 ${insightsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900">AI Insights</span>
          <button className="ml-auto text-gray-500 hover:text-gray-700" onClick={() => setInsightsOpen(false)}>Close</button>
    </div>
        <div className="p-4 overflow-y-auto">
          <AIWidget />
        </div>
      </div>

      {/* No floating insights toggle on Schedule page (only on Home) */}
    </div>
    </AuthGuard>
  );
}