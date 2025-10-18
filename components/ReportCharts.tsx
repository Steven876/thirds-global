/**
 * ReportCharts Component
 * 
 * Displays performance charts and analytics for user sessions.
 * Uses simple div-based charts for now, can be enhanced with chart libraries.
 * 
 * TODO: Integrate with chart library (recharts, chart.js, etc.)
 * TODO: Add more chart types (line charts, heatmaps)
 * TODO: Add data export functionality
 */

'use client';

import { TrendingUp, Clock, Target, AlertTriangle } from 'lucide-react';

interface ReportData {
  timeByBlock: {
    morning: number;
    afternoon: number;
    night: number;
  };
  averageFocusDuration: number;
  mostProductiveBlock: string;
  mostPausedBlock: string;
  aiRecommendation?: string;
}

interface ReportChartsProps {
  data: ReportData;
}

export default function ReportCharts({ data }: ReportChartsProps) {
  const maxTime = Math.max(...Object.values(data.timeByBlock));
  
  const getBlockColor = (block: string) => {
    switch (block) {
      case 'morning': return 'bg-yellow-400';
      case 'afternoon': return 'bg-orange-400';
      case 'night': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-8">
      {/* Time by Block Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Clock className="h-5 w-5 text-blue-600 mr-2" />
          Time Spent by Energy Block
        </h3>
        
        <div className="space-y-4">
          {Object.entries(data.timeByBlock).map(([block, minutes]) => {
            const percentage = maxTime > 0 ? (minutes / maxTime) * 100 : 0;
            
            return (
              <div key={block} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {block} Block
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(minutes)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getBlockColor(block)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={minutes}
                    aria-valuemin={0}
                    aria-valuemax={maxTime}
                    aria-label={`${block} block: ${formatDuration(minutes)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Focus Duration */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Target className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Avg Focus Duration</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatDuration(data.averageFocusDuration)}
          </div>
          <p className="text-sm text-gray-500">
            Per session
          </p>
        </div>

        {/* Most Productive Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Most Productive</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2 capitalize">
            {data.mostProductiveBlock}
          </div>
          <p className="text-sm text-gray-500">
            Energy block
          </p>
        </div>

        {/* Most Paused Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Needs Attention</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2 capitalize">
            {data.mostPausedBlock}
          </div>
          <p className="text-sm text-gray-500">
            Most interruptions
          </p>
        </div>
      </div>

      {/* AI Recommendation */}
      {data.aiRecommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            AI Recommendation
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {data.aiRecommendation}
          </p>
        </div>
      )}

      {/* Weekly Trend Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Weekly Focus Trend
        </h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">Weekly trend chart coming soon</p>
            <p className="text-xs text-gray-400 mt-1">
              TODO: Integrate with chart library
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
