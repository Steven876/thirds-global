/**
 * Time utility functions for Thirds app
 * 
 * This file contains helper functions for time formatting, block detection,
 * and theme management based on time of day.
 * TODO: Add timezone support
 * TODO: Add more sophisticated energy level calculations
 */

import { EnergyLevel, Block } from './types';

/**
 * Determines the current energy block based on time of day
 * TODO: Make this configurable based on user's wake/sleep times
 */
export function getCurrentBlock(now: Date = new Date()): Block {
  const hour = now.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'night';
  }
}

/**
 * Returns a motivational message based on energy level
 * TODO: Make these messages more personalized and dynamic
 */
export function getEnergyMessage(energy: EnergyLevel): string {
  const messages = {
    high: "You're in your High Energy period — get cracking!",
    medium: "Steady energy flow — maintain your momentum!",
    low: "Time for gentle focus — every step counts!"
  };
  
  return messages[energy];
}

/**
 * Formats time range for display
 * TODO: Add 12/24 hour format preference
 */
export function formatRange(startTime: string, endTime: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Converts seconds to MM:SS format
 * TODO: Add hours support for longer durations
 */
export function secondsToMMSS(seconds: number): string {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Returns Tailwind classes for block-specific theming
 * TODO: Add more sophisticated color schemes
 * TODO: Add dark mode support
 */
export function getBlockTheme(block: Block): string {
  const themes = {
    morning: 'from-yellow-100 via-orange-200 to-orange-300',
    afternoon: 'from-orange-200 via-amber-200 to-blue-200',
    night: 'from-indigo-900 via-indigo-700 to-slate-800'
  };
  
  return `bg-gradient-to-br ${themes[block]}`;
}

/**
 * Returns energy level color classes
 * TODO: Add more color variations
 */
export function getEnergyColor(energy: EnergyLevel): string {
  const colors = {
    high: 'text-orange-600 bg-orange-100',
    medium: 'text-amber-600 bg-amber-100',
    low: 'text-slate-600 bg-slate-100'
  };
  
  return colors[energy];
}

/**
 * Gets the current time in HH:MM format
 * TODO: Add timezone support
 */
export function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Checks if current time is within a given range
 * TODO: Add support for overnight ranges
 */
export function isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    // Handle overnight ranges
    return current >= start || current <= end;
  }
}

/**
 * Converts HH:MM time to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
