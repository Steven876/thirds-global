/**
 * ScheduleForm Component
 * 
 * Form for creating and editing daily schedules across morning, afternoon, and night blocks.
 * Handles validation, recurring days, and API integration.
 * 
 * TODO: Add form validation with proper error messages
 * TODO: Add time conflict detection
 * TODO: Add schedule templates
 */

'use client';

import { useState } from 'react';
import { Save, Calendar, Eye, Clock, Zap, Battery, Moon } from 'lucide-react';
import { EnergyLevel, Block } from '@/lib/types';
import ErrorMessage from './ErrorMessage';

interface ScheduleData {
  block: Block;
  start_time: string;
  end_time: string;
  energy: EnergyLevel;
  task: string;
  notes: string;
  recurring_days: string[];
}

const energyOptions: { value: EnergyLevel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'high', label: 'High Energy', icon: Zap },
  { value: 'medium', label: 'Medium Energy', icon: Battery },
  { value: 'low', label: 'Low Energy', icon: Moon }
];

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const blocks: Block[] = ['morning', 'afternoon', 'night'];

export default function ScheduleForm() {
  const [schedules, setSchedules] = useState<Record<Block, ScheduleData>>({
    morning: {
      block: 'morning',
      start_time: '06:00',
      end_time: '12:00',
      energy: 'high',
      task: '',
      notes: '',
      recurring_days: []
    },
    afternoon: {
      block: 'afternoon',
      start_time: '12:00',
      end_time: '18:00',
      energy: 'medium',
      task: '',
      notes: '',
      recurring_days: []
    },
    night: {
      block: 'night',
      start_time: '18:00',
      end_time: '22:00',
      energy: 'low',
      task: '',
      notes: '',
      recurring_days: []
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateSchedule = (block: Block, field: keyof ScheduleData, value: string | string[]) => {
    setSchedules(prev => ({
      ...prev,
      [block]: {
        ...prev[block],
        [field]: value
      }
    }));
  };

  const toggleRecurringDay = (block: Block, day: string) => {
    const currentDays = schedules[block].recurring_days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    updateSchedule(block, 'recurring_days', newDays);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/schedule', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(Object.values(schedules))
      // });
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Schedule saved successfully!');
    } catch (err) {
      setError('Failed to save schedule. Please try again.');
      console.error('Error saving schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToWeek = async () => {
    // TODO: Implement apply to week functionality
    console.log('Apply to week');
  };

  const handlePreview = () => {
    // TODO: Implement preview functionality
    console.log('Preview schedule');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Builder</h1>
        <p className="text-gray-600">Structure your day around your energy levels</p>
      </div>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-8">
        {blocks.map((block) => (
          <div key={block} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Clock className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {block} Block
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Time Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Time Range</label>
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={schedules[block].start_time}
                    onChange={(e) => updateSchedule(block, 'start_time', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="flex items-center text-gray-500">to</span>
                  <input
                    type="time"
                    value={schedules[block].end_time}
                    onChange={(e) => updateSchedule(block, 'end_time', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Energy Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Energy Level</label>
                <select
                  value={schedules[block].energy}
                  onChange={(e) => updateSchedule(block, 'energy', e.target.value as EnergyLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {energyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Task</label>
                <input
                  type="text"
                  value={schedules[block].task}
                  onChange={(e) => updateSchedule(block, 'task', e.target.value)}
                  placeholder="What will you work on?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <input
                  type="text"
                  value={schedules[block].notes}
                  onChange={(e) => updateSchedule(block, 'notes', e.target.value)}
                  placeholder="Additional notes or goals"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Recurring Days */}
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700 mb-3 block">Recurring Days</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleRecurringDay(block, day)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      schedules[block].recurring_days.includes(day)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Saving...' : 'Save Schedule'}</span>
        </button>

        <button
          onClick={handleApplyToWeek}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <Calendar className="h-4 w-4" />
          <span>Apply to Week</span>
        </button>

        <button
          onClick={handlePreview}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <Eye className="h-4 w-4" />
          <span>Preview</span>
        </button>
      </div>
    </div>
  );
}
