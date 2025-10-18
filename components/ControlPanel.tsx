/**
 * ControlPanel Component
 * 
 * Main control interface for starting, pausing, and managing work sessions.
 * Handles different states and provides user feedback.
 * 
 * TODO: Add session persistence
 * TODO: Add keyboard shortcuts
 * TODO: Add session statistics
 */

'use client';

import { useState } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

type SessionState = 'idle' | 'running' | 'paused' | 'completed';

interface ControlPanelProps {
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  error?: string | null;
}

export default function ControlPanel({
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  disabled = false,
  error
}: ControlPanelProps) {
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  const handleStart = () => {
    setSessionState('running');
    onStart?.();
  };

  const handlePause = () => {
    setSessionState('paused');
    onPause?.();
  };

  const handleResume = () => {
    setSessionState('running');
    onResume?.();
  };

  const handleStop = () => {
    setSessionState('completed');
    onStop?.();
  };

  const handleReset = () => {
    setSessionState('idle');
    onReset?.();
  };

  const getButtonConfig = () => {
    switch (sessionState) {
      case 'idle':
        return {
          primary: { label: 'Start', icon: Play, onClick: handleStart, variant: 'start' },
          secondary: { label: 'Reset', icon: RotateCcw, onClick: handleReset, variant: 'secondary' }
        };
      case 'running':
        return {
          primary: { label: 'Pause', icon: Pause, onClick: handlePause, variant: 'pause' },
          secondary: { label: 'Stop', icon: Square, onClick: handleStop, variant: 'stop' }
        };
      case 'paused':
        return {
          primary: { label: 'Resume', icon: Play, onClick: handleResume, variant: 'start' },
          secondary: { label: 'Stop', icon: Square, onClick: handleStop, variant: 'stop' }
        };
      case 'completed':
        return {
          primary: { label: 'Start New', icon: Play, onClick: handleStart, variant: 'start' },
          secondary: { label: 'Reset', icon: RotateCcw, onClick: handleReset, variant: 'secondary' }
        };
      default:
        return {
          primary: { label: 'Start', icon: Play, onClick: handleStart, variant: 'start' },
          secondary: { label: 'Reset', icon: RotateCcw, onClick: handleReset, variant: 'secondary' }
        };
    }
  };

  const { primary, secondary } = getButtonConfig();

  const getButtonStyles = (variant: string) => {
    const baseStyles = 'inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'start':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
      case 'pause':
        return `${baseStyles} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500`;
      case 'stop':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      case 'secondary':
        return `${baseStyles} bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Control buttons */}
      <div className="flex space-x-4">
        <button
          onClick={primary.onClick}
          disabled={disabled}
          className={getButtonStyles(primary.variant)}
        >
          <primary.icon className="h-4 w-4" />
          <span>{primary.label}</span>
        </button>

        <button
          onClick={secondary.onClick}
          disabled={disabled}
          className={getButtonStyles(secondary.variant)}
        >
          <secondary.icon className="h-4 w-4" />
          <span>{secondary.label}</span>
        </button>
      </div>

      {/* Session status */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          sessionState === 'running' ? 'bg-green-100 text-green-700' :
          sessionState === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          sessionState === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {sessionState === 'running' && 'Session Active'}
          {sessionState === 'paused' && 'Session Paused'}
          {sessionState === 'completed' && 'Session Completed'}
          {sessionState === 'idle' && 'Ready to Start'}
        </div>
      </div>
    </div>
  );
}
