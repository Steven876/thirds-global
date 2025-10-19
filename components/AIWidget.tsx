/**
 * AIWidget Component
 * 
 * Right sidebar widget that displays AI-powered insights and suggestions.
 * Fetches personalized recommendations from /api/insights based on user's session data.
 * Shows loading states and handles errors gracefully.
 */

'use client';

import { useState, useEffect } from 'react';
import { Brain, Lightbulb, TrendingUp, RefreshCw } from 'lucide-react';
import { InsightsResponse } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import EmptyState from './EmptyState';
import ErrorMessage from './ErrorMessage';

export default function AIWidget() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Not authenticated: render a quiet empty state without throwing
        setInsights(null);
        setError('Sign in to view insights');
        return;
      }
      
      const response = await fetch('/api/insights', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (!response.ok || !data?.ok) {
        setInsights(null);
        setError(data?.error || 'Failed to fetch insights');
        return;
      }
      
      setInsights(data.data);
    } catch (err) {
      setError('Failed to load personalized insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchInsights(true);
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
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh insights'}</span>
        </button>
      </div>
    </div>
  );
}
