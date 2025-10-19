/**
 * Reports Page
 * 
 * Analytics and insights dashboard showing performance metrics.
 * Features charts, statistics, and AI recommendations.
 * 
 * TODO: Add date range picker
 * TODO: Add data export functionality
 * TODO: Add more detailed analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import ScheduleGuard from '@/components/ScheduleGuard';
import Footer from '@/components/Footer';
import ReportCharts from '@/components/ReportCharts';
// import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { Calendar, Download, Filter } from 'lucide-react';

// Mock report data
const mockReportData = {
  timeByBlock: {
    morning: 180, // 3 hours in minutes
    afternoon: 120, // 2 hours in minutes
    night: 60 // 1 hour in minutes
  },
  averageFocusDuration: 45, // 45 minutes
  mostProductiveBlock: 'morning',
  mostPausedBlock: 'afternoon',
  aiRecommendation: 'Your morning sessions are highly productive. Consider scheduling your most important tasks during this time and reducing afternoon interruptions.'
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState(mockReportData);

  useEffect(() => {
    // TODO: Fetch actual report data from API
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setReportData(mockReportData);
      } catch (err) {
        setError('Failed to load report data. Please try again.');
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleExport = () => {
    // TODO: Implement data export
    console.log('Export data');
  };

  const handleDateFilter = () => {
    // TODO: Implement date filtering
    console.log('Filter by date');
  };

  if (loading) {
    return (
      <AuthGuard>
      <ScheduleGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </main>
        <Footer />
      </div>
      </ScheduleGuard>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
    <ScheduleGuard>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Insights</h1>
            <p className="text-gray-600">
              Track your productivity patterns and optimize your workflow
            </p>
          </div>
          
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={handleDateFilter}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </motion.div>

        {/* Date Range Picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex items-center space-x-2">
              <input
                type="date"
                defaultValue="2024-01-01"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                defaultValue="2024-01-31"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update
            </button>
          </div>
        </motion.div>

        {/* Report Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ReportCharts data={reportData} />
        </motion.div>

        {/* Additional Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Focus Time</span>
                <span className="font-semibold">28h 45m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions Completed</span>
                <span className="font-semibold">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Session</span>
                <span className="font-semibold">41m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Focus Rate</span>
                <span className="font-semibold text-green-600">89%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Daily Focus Goal</span>
                  <span className="text-sm font-semibold">6h / 8h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Weekly Sessions</span>
                  <span className="text-sm font-semibold">42 / 50</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
    </ScheduleGuard>
    </AuthGuard>
  );
}
