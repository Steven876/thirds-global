/**
 * TaskList Component
 * 
 * Displays a list of tasks with energy levels and completion status.
 * Auto-checks completed items and shows empty state when no tasks.
 * 
 * TODO: Add drag-and-drop reordering
 * TODO: Add task editing functionality
 * TODO: Add task deletion
 */

'use client';

import { useState } from 'react';
import { Check, Clock, Zap, Battery, Moon } from 'lucide-react';
import { TaskItem } from '@/lib/types';
import EmptyState from './EmptyState';

interface TaskListProps {
  items: TaskItem[];
  onTaskToggle?: (index: number) => void;
}

const energyIcons = {
  high: Zap,
  medium: Battery,
  low: Moon
};

const energyColors = {
  high: 'text-orange-600 bg-orange-100',
  medium: 'text-amber-600 bg-amber-100',
  low: 'text-slate-600 bg-slate-100'
};

export default function TaskList({ items, onTaskToggle }: TaskListProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  const handleTaskToggle = (index: number) => {
    const newCompleted = new Set(completedTasks);
    if (completedTasks.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedTasks(newCompleted);
    onTaskToggle?.(index);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No tasks scheduled"
        description="Create your schedule to see your tasks here."
        cta={{
          label: 'Create Schedule',
          onClick: () => {
            // TODO: Navigate to schedule page
            console.log('Navigate to schedule');
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Today&apos;s Tasks
      </h3>
      
      {items.map((item, index) => {
        const isCompleted = completedTasks.has(index) || item.done;
        const EnergyIcon = energyIcons[item.energy];
        
        return (
          <div
            key={index}
            className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
              isCompleted
                ? 'bg-gray-50 border-gray-200 opacity-75'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleTaskToggle(index)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              aria-label={`Mark task as ${isCompleted ? 'incomplete' : 'complete'}`}
            >
              {isCompleted && <Check className="h-3 w-3" />}
            </button>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${
                  isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {item.label}
                </h4>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${energyColors[item.energy]}`}>
                  <EnergyIcon className="h-3 w-3" />
                  <span>{item.energy}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{item.range}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
