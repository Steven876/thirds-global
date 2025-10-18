/**
 * AIWidget Component
 * 
 * Right sidebar widget that displays AI-powered insights and suggestions.
 * Fetches data from /api/insights and handles loading/error states.
 * 
 * TODO: Replace mock data with real AI integration
 * TODO: Add more sophisticated recommendation engine
 * TODO: Add user feedback on suggestions
 */

'use client';

import { useState, useEffect } from 'react';
import { Brain, Lightbulb, TrendingUp } from 'lucide-react';
import { InsightsResponse } from '@/lib/types';
import EmptyState from './EmptyState';
import ErrorMessage from './ErrorMessage';

export default function AIWidget() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/insights');
      // const data = await response.json();
      
      // Mock data for now
      const mockData: InsightsResponse = {
        suggestions: [
          "You've completed 4h of deep work — consider a longer break.",
          "Your morning sessions are most productive. Try scheduling important tasks then.",
          "You've been pausing frequently in the afternoon. Consider adjusting your schedule.",
          "Great job maintaining focus! Your consistency is improving."
        ]
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setInsights(mockData);
    } catch (err) {
      setError('Failed to load insights. Please try again.');
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!insights || insights.suggestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <EmptyState
          title="No insights yet"
          description="Complete some sessions to get personalized recommendations."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
      </div>

      <div className="space-y-4">
        {insights.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {index === 0 ? (
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                ) : (
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                )}
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">
                {suggestion}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={fetchInsights}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Refresh insights
        </button>
      </div>
    </div>
  );
}
