/**
 * CircularTimer Component
 * 
 * A circular progress timer that displays remaining time and current task.
 * Color-coded by energy level with smooth animations.
 * 
 * TODO: Add WebSocket support for real-time updates
 * TODO: Add sound notifications
 * TODO: Add pause/resume functionality
 */

'use client';

import { useEffect, useState } from 'react';
import { CircularTimerProps } from '@/lib/types';
import { secondsToMMSS, getEnergyColor } from '@/lib/time';

export default function CircularTimer({ 
  currentTask, 
  timeRemainingSec, 
  energyLevel, 
  onComplete 
}: CircularTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeRemainingSec);
  const [isRunning, setIsRunning] = useState(false);

  // Update display time when prop changes
  useEffect(() => {
    setDisplayTime(timeRemainingSec);
  }, [timeRemainingSec]);

  // Handle timer completion
  useEffect(() => {
    if (displayTime <= 0 && isRunning) {
      setIsRunning(false);
      onComplete();
    }
  }, [displayTime, isRunning, onComplete]);

  // Calculate progress percentage (0-100)
  const progress = Math.max(0, Math.min(100, (displayTime / (25 * 60)) * 100)); // Assuming 25min max
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const energyColors = {
    high: 'stroke-orange-500',
    medium: 'stroke-amber-500', 
    low: 'stroke-slate-500'
  };

  const energyBgColors = {
    high: 'text-orange-600',
    medium: 'text-amber-600',
    low: 'text-slate-600'
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Timer Circle */}
      <div className="relative">
        <svg
          className="w-48 h-48 transform -rotate-90"
          viewBox="0 0 200 200"
        >
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${energyColors[energyLevel]} transition-all duration-1000 ease-linear`}
            strokeLinecap="round"
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-3xl font-bold ${energyBgColors[energyLevel]}`}>
              {secondsToMMSS(displayTime)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              remaining
            </div>
          </div>
        </div>
      </div>

      {/* Current Task */}
      <div className="text-center max-w-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Current Task
        </h3>
        <p className="text-gray-600 break-words">
          {currentTask || 'No task selected'}
        </p>
      </div>

      {/* Energy Level Indicator */}
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEnergyColor(energyLevel)}`}>
        {energyLevel.charAt(0).toUpperCase() + energyLevel.slice(1)} Energy
      </div>
    </div>
  );
}
