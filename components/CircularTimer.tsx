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
import { secondsToMMSS } from '@/lib/time';

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

  // Calculate progress percentage relative to the provided timeRemainingSec baseline
  const maxSeconds = Math.max(timeRemainingSec, 1);
  const progress = Math.max(0, Math.min(100, (displayTime / maxSeconds) * 100));
  const radius = 120; // bigger radius for larger circle
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const energyColors = {
    high: 'stroke-orange-500',
    medium: 'stroke-amber-500', 
    low: 'stroke-slate-500'
  };

  const energyBgColors = {
    high: 'text-white',
    medium: 'text-white',
    low: 'text-white'
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Timer Circle */}
      <div className="relative">
        <svg
          className="w-72 h-72 transform -rotate-90 drop-shadow-lg"
          viewBox="0 0 300 300"
        >
          {/* Background circle */}
          <circle
            cx="150"
            cy="150"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-gray-200"
          />
          
          {/* Progress circle */}
          <circle
            cx="150"
            cy="150"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
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
            <div className={`text-5xl font-bold ${energyBgColors[energyLevel]}`}>
              {secondsToMMSS(displayTime)}
            </div>
            {/* no extra caption to keep contrast in night theme */}
          </div>
        </div>
      </div>
      {/* Simplified: external container handles current/next task labels */}
    </div>
  );
}
