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
import AIWidget from '@/components/AIWidget';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentBlock, getBlockTheme } from '@/lib/time';
import { supabase } from '@/lib/supabaseClient';
import ErrorMessage from '@/components/ErrorMessage';
import { 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Edit, 
  Calendar
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
  }[] | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [originalScheduleData, setOriginalScheduleData] = useState<ScheduleData | null>(null);

  // Calculate block duration in minutes
  const getBlockDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  // Validate times for current day
  const validateTimes = (): boolean => {
    const currentDayData = scheduleData.days[currentDay];
    const { high, medium, low } = currentDayData.times;
    
    // Check if times are valid
    if (!high.startTime || !high.endTime || !medium.startTime || !medium.endTime || !low.startTime || !low.endTime) {
      setError('Please fill in all time fields');
      return false;
    }

    // 24h HH:MM minute-based comparisons (support overnight ranges like 21:00 → 01:00)
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

    // Duration must be > 0; allow overnight by wrapping to next day
    const duration = (s: number, e: number) => (e - s + 1440) % 1440;
    if (duration(hS, hE) === 0 || duration(mS, mE) === 0 || duration(lS, lE) === 0) {
      setError('Start time must be before end time for each block');
      return false;
    }

    // Overlap detection on a 24h ring: split wrapped intervals into two segments
    const splitSegs = (s: number, e: number): Array<{s:number;e:number}> => {
      if (e > s) return [{ s, e }];
      // wraps midnight
      return [{ s, e: 1440 }, { s: 0, e }];
    };
    const segsH = splitSegs(hS, hE);
    const segsM = splitSegs(mS, mE);
    const segsL = splitSegs(lS, lE);
    const segsOverlap = (A: Array<{s:number;e:number}>, B: Array<{s:number;e:number}>) =>
      A.some(a => B.some(b => a.s < b.e && b.s < a.e));
    if (segsOverlap(segsH, segsM) || segsOverlap(segsH, segsL) || segsOverlap(segsM, segsL)) {
      setError('Energy block times cannot overlap. Please adjust the times.');
      return false;
    }
    return true;
  };

  // Validate tasks for current block and day
  const validateTasks = (): boolean => {
    const currentDayData = scheduleData.days[currentDay];
    const currentTasks = currentDayData.tasks[currentTaskBlock];
    const currentTimes = currentDayData.times[currentTaskBlock];
    const blockDuration = getBlockDuration(currentTimes.startTime, currentTimes.endTime);
    const totalTaskDuration = currentTasks.reduce((sum, task) => sum + task.duration, 0);

    if (totalTaskDuration > blockDuration) {
      setError(`Total task duration (${totalTaskDuration}min) exceeds block duration (${blockDuration}min)`);
      return false;
    }

    return true;
  };

  // Validate at least one task exists for each energy block
  const hasAtLeastOnePerBlock = (): boolean => {
    const dayData = scheduleData.days[currentDay];
    return (
      dayData.tasks.high.length > 0 &&
      dayData.tasks.medium.length > 0 &&
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
    
    const currentTimes = scheduleData.days[currentDay].times;
    applyTimesToSelectedDays(currentTimes);
    
    setSuccess('Block times updated across all selected days.');
    setTimeout(() => setSuccess(null), 3000);
    setCurrentStep('tasks');
    // Refresh blocks view live when saving later
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

      // Expand tasks according to repeat selection
      const selectedDays = getSelectedDays();

      // Map frontend status to backend TaskStatus
      const mapStatus = (): 'active' | 'completed' | 'skipped' => 'active';

      for (const day of selectedDays) {
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

        // Create tasks under the corresponding sessions (from the 'currentDay' blueprint)
        const source = scheduleData.days[currentDay];
        for (const block of ['high', 'medium', 'low'] as const) {
          for (const task of source.tasks[block]) {
            if (!task.name) continue;
            await fetch('/api/sessions', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                session_id: blockToSessionId[block],
                name: task.name,
                description: task.description || null,
                duration_minutes: task.duration,
                status: mapStatus()
              })
            });
          }
        }
      }

      setSavedSchedule(scheduleData);
      setCurrentStep('overview');
      setShowModal(false);
      setSuccess('Schedule saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await loadTodayBlocks();
    } catch {
      setError('Failed to save schedule. Please try again.');
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
              {(['high','medium','low'] as const).map((blockKey) => {
                const times = scheduleData.days[currentDay].times[blockKey];
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
                          className="w-full px-3 py-2 bg-white/90 text-slate-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="w-full px-3 py-2 bg-white/90 text-slate-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onClick={handleSaveTimes}
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
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Define Your Tasks</h2>
              <p className="text-gray-600">Add tasks for each energy block</p>
            </div>

            {/* Removed day selection per requirements */}

            {/* Block Navigation with arrows */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setCurrentTaskBlock(prev => prev === 'high' ? 'low' : prev === 'medium' ? 'high' : 'medium')}
                className="px-3 py-2 rounded-lg text-slate-900 hover:text-slate-700"
                aria-label="Previous block"
              >
                ←
              </button>
              <div className="px-4 py-2 rounded-lg bg-white/70 backdrop-blur-sm border border-white/40 font-medium capitalize text-slate-900">
                {currentTaskBlock} Energy
              </div>
              <button
                onClick={() => setCurrentTaskBlock(prev => prev === 'high' ? 'medium' : prev === 'medium' ? 'low' : 'high')}
                className="px-3 py-2 rounded-lg text-slate-900 hover:text-slate-700"
                aria-label="Next block"
              >
                →
              </button>
            </div>

            {/* Current Block Tasks */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {currentTaskBlock} Energy Tasks for {currentDay}
                </h3>
                <button
                  onClick={addTask}
                  className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
              </div>

              <div className="space-y-4">
                {scheduleData.days[currentDay].tasks[currentTaskBlock].map((task) => (
                  <div key={task.id} className="rounded-lg p-4 border border-white/30 bg-white/70 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Name
                        </label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => !task.locked && updateTask(task.id, 'name', e.target.value)}
                          placeholder="Enter task name"
                          className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${task.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white/90 border border-gray-300 text-slate-900'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (min)
                        </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
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
                  onClick={() => hasAtLeastOnePerBlock() ? setCurrentStep('repeat') : setError('Add at least one task to each energy block before continuing.')}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${hasAtLeastOnePerBlock() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
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
      const { data: scheduleRow, error: sErr } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_id', uid)
        .eq('day_of_week', weekday)
        .single();
      if (sErr || !scheduleRow) { setDayBlocks(null); return; }
      const scheduleId = scheduleRow.id;
      const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('id, template_id')
        .eq('schedule_id', scheduleId);
      if (sessErr || !sessions) { setDayBlocks(null); return; }
      const templateIds = sessions.map(s => s.template_id);
      const { data: templates } = await supabase
        .from('session_templates')
        .select('id, energy_type, start_time, end_time')
        .in('id', templateIds);
      const tmplById = Object.fromEntries((templates || []).map(t => [t.id, t]));
      const sessionIds = sessions.map(s => s.id);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, session_id, name, description, duration_minutes, status')
        .in('session_id', sessionIds);
      const tasksBySession: Record<number, any[]> = {};
      (tasks || []).forEach(t => {
        tasksBySession[t.session_id] = tasksBySession[t.session_id] || [];
        tasksBySession[t.session_id].push(t);
      });
      const blocks = sessions.map(s => {
        const tmpl = tmplById[s.template_id];
        return {
          energy: tmpl?.energy_type || 'High',
          sessionId: s.id,
          start_time: tmpl?.start_time || '00:00',
          end_time: tmpl?.end_time || '00:00',
          tasks: tasksBySession[s.id] || []
        };
      }).sort((a,b) => (a.energy === 'High' ? 0 : a.energy === 'Medium' ? 1 : 2) - (b.energy === 'High' ? 0 : b.energy === 'Medium' ? 1 : 2));
      setDayBlocks(blocks);
    } catch (e) {
      console.error('Failed to load day blocks', e);
      setDayBlocks(null);
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

  const BlocksView = () => {
    if (!dayBlocks) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dayBlocks.map(block => (
          <div
            key={block.sessionId}
            className={`rounded-2xl p-4 backdrop-blur-sm border ${
              block.energy === 'High' ? 'bg-emerald-50/70 border-emerald-200' :
              block.energy === 'Medium' ? 'bg-amber-50/70 border-amber-200' :
              'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-900">{block.energy} Energy</div>
            </div>
            <div className="space-y-3">
              {block.tasks.length === 0 && (
                <div className="text-sm text-slate-600">No tasks for this block.</div>
              )}
              {block.tasks.map(t => (
                <div key={t.id} className="rounded-lg border border-white/30 bg-white/80 p-3">
                  {editingTaskId === t.id ? (
                    <div className="space-y-2">
                      <input defaultValue={t.name} onBlur={(e)=>updateTaskField(t.id,{ name: e.target.value })} className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900" />
                      <textarea defaultValue={t.description || ''} onBlur={(e)=>updateTaskField(t.id,{ description: e.target.value || null })} rows={2} className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900" />
                      <input type="number" defaultValue={t.duration_minutes || 0} onBlur={(e)=>updateTaskField(t.id,{ duration_minutes: parseInt(e.target.value)||0 })} className="w-full px-3 py-2 rounded bg-white/90 border border-gray-300 text-slate-900" />
                      <div className="text-right">
                        <button onClick={()=>setEditingTaskId(null)} className="px-3 py-1 text-sm text-slate-700">Done</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{t.name}</div>
                        {t.description && <div className="text-sm text-slate-600">{t.description}</div>}
                        {typeof t.duration_minutes === 'number' && <div className="text-xs text-slate-500 mt-1">{t.duration_minutes} min</div>}
                      </div>
                      <button className="text-sm text-blue-700 hover:underline" onClick={()=>setEditingTaskId(t.id)}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AuthGuard>
    <div className={`min-h-screen gradient-transition animated-gradient ${getBlockTheme(currentBlock)} relative overflow-hidden`}>
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

        {dayBlocks !== null ? (
          <div className="max-w-6xl mx-auto">
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

      {/* Three-dot menu top-right */}
      {!insightsOpen && (
        <button
          onClick={() => setInsightsOpen(true)}
          className="fixed top-4 right-4 z-40 text-white hover:opacity-80 transition-opacity p-2"
          aria-label="Open menu"
        >
          <span className="sr-only">Open insights</span>
          <div className="flex items-center justify-center space-x-1.5">
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
            <span className="block h-1.5 w-1.5 bg-white rounded-full"></span>
          </div>
        </button>
      )}
    </div>
    </AuthGuard>
  );
}