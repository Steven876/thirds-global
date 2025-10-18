/**
 * ErrorMessage Component
 * 
 * A reusable error message component with dismissible functionality.
 * Used throughout the app to display user-friendly error messages.
 * 
 * TODO: Add different error types (warning, error, info)
 * TODO: Add auto-dismiss functionality
 * TODO: Add accessibility improvements
 */

'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ErrorMessageProps } from '@/lib/types';

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3 animate-fade-in"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-800 text-sm font-medium">
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss error message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
