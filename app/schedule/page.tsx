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

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
  status: 'not-started' | 'in-progress' | 'done';
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

const statusOptions = [
  { value: 'not-started', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' }
];

export default function SchedulePage() {
  const [currentStep, setCurrentStep] = useState<'times' | 'tasks' | 'repeat' | 'overview'>('times');
  const [currentTaskBlock, setCurrentTaskBlock] = useState<'high' | 'medium' | 'low'>('high');
  const [currentDay, setCurrentDay] = useState<string>('Monday');
  const [showModal, setShowModal] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        }
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

    // Check if start time is before end time for each block
    if (high.startTime >= high.endTime || medium.startTime >= medium.endTime || low.startTime >= low.endTime) {
      setError('Start time must be before end time for each block');
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

  // Add new task
  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      name: '',
      duration: 30,
      description: '',
      status: 'not-started'
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
  const updateTask = (taskId: string, field: keyof Task, value: string | number) => {
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
    const selectedDays = getSelectedDays();
    
    setScheduleData(prev => {
      const newDays = { ...prev.days };
      selectedDays.forEach(day => {
        newDays[day] = {
          ...newDays[day],
          times: { ...times }
        };
      });
      return {
        ...prev,
        days: newDays
      };
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
  };

  // Save tasks for current block
  const handleSaveTasks = () => {
    if (!validateTasks()) return;
    setSuccess('Tasks saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Save entire schedule
  const handleSaveSchedule = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/schedule', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(scheduleData)
      // });

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSavedSchedule(scheduleData);
      setCurrentStep('overview');
      setShowModal(false);
      setSuccess('Schedule saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
              <p className="text-gray-600">Define when each energy level occurs in your day</p>
            </div>

            {/* Day Selection */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Day to Configure
              </label>
              <select
                value={currentDay}
                onChange={(e) => setCurrentDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="space-y-6">
              {Object.entries(scheduleData.days[currentDay].times).map(([block, times]) => (
                <div key={block} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                    {block} Energy Block
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
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
                                [block]: { ...times, startTime: e.target.value }
                              }
                            }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
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
                                [block]: { ...times, endTime: e.target.value }
                              }
                            }
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                <span>Save & Continue</span>
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

            {/* Day Selection */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Day to Configure Tasks
              </label>
              <select
                value={currentDay}
                onChange={(e) => setCurrentDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            {/* Block Navigation */}
            <div className="flex justify-center space-x-4">
              {(['high', 'medium', 'low'] as const).map((block) => (
                <button
                  key={block}
                  onClick={() => setCurrentTaskBlock(block)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentTaskBlock === block
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {block.charAt(0).toUpperCase() + block.slice(1)} Energy
                </button>
              ))}
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
                  <div key={task.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Task Name
                        </label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                          placeholder="Enter task name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          value={task.duration}
                          onChange={(e) => updateTask(task.id, 'duration', parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={task.status}
                          onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
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
                        onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                        placeholder="Enter task description"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                  Total duration: {scheduleData.days[currentDay].tasks[currentTaskBlock].reduce((sum, task) => sum + task.duration, 0)} minutes
                </div>
                <button
                  onClick={handleSaveTasks}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Tasks</span>
                </button>
              </div>
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
                  onClick={() => setCurrentStep('times')}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setCurrentStep('repeat')}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

  // Weekly overview component
  const WeeklyOverview = () => {
    if (!savedSchedule) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Weekly Schedule</h2>
          <p className="text-gray-600">Overview of your energy-based schedule</p>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center">{day}</h3>
              
              {(['high', 'medium', 'low'] as const).map((block) => (
                <div key={block} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {block} Energy
                    </span>
                    <button
                      onClick={() => {
                        setCurrentDay(day);
                        handleEditSchedule();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    {savedSchedule.days[day].times[block].startTime} - {savedSchedule.days[day].times[block].endTime}
                  </div>
                  
                  <div className="space-y-1">
                    {savedSchedule.days[day].tasks[block].map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded p-2 text-xs">
                        <div className="font-medium text-gray-900">{task.name}</div>
                        <div className="text-gray-500">{task.duration}min</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleEditSchedule}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Schedule</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            {success}
          </div>
        )}

        {savedSchedule ? (
          <WeeklyOverview />
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Schedule</h2>
            <p className="text-gray-600 mb-6">Set up your energy-based daily schedule</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Start Building</span>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
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

      <Footer />
    </div>
  );
}