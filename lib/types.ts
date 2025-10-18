/**
 * Shared TypeScript types and interfaces for Thirds app
 * 
 * This file contains all the core data structures used throughout the application.
 * TODO: Add more specific validation schemas using zod or similar
 */

export type EnergyLevel = 'high' | 'medium' | 'low';
export type Block = 'morning' | 'afternoon' | 'night';

export interface Profile {
  id: string;
  username?: string;
  email?: string;
  wake_time?: string; // HH:MM format
  sleep_time?: string; // HH:MM format
  ai_personalization: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  block: Block;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  energy: EnergyLevel;
  task: string;
  notes?: string;
  recurring_days: string[]; // ['monday', 'tuesday', etc.]
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_date: string; // YYYY-MM-DD format
  block: Block;
  task: string;
  duration_seconds: number;
  completed: boolean;
  paused: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_date: string; // YYYY-MM-DD format
  total_focus_seconds: number;
  most_productive_block?: Block;
  most_paused_block?: Block;
  ai_recommendation?: string;
  created_at: string;
}

// UI Component Props
export interface TaskItem {
  label: string;
  range: string;
  energy: EnergyLevel;
  done?: boolean;
}

export interface CircularTimerProps {
  currentTask: string;
  timeRemainingSec: number;
  energyLevel: EnergyLevel;
  onComplete: () => void;
}

export interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface InsightsResponse {
  suggestions: string[];
}
