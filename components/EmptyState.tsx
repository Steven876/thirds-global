/**
 * EmptyState Component
 * 
 * A reusable empty state component for when there's no data to display.
 * Used throughout the app to provide helpful guidance when lists are empty.
 * 
 * TODO: Add different empty state illustrations
 * TODO: Add more interactive CTAs
 * TODO: Add loading states
 */

'use client';

import { EmptyStateProps } from '@/lib/types';
import { FileText, Plus } from 'lucide-react';

export default function EmptyState({ title, description, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-sm">
        {description}
      </p>
      
      {cta && (
        <button
          onClick={cta.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          {cta.label}
        </button>
      )}
    </div>
  );
}
