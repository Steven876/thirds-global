/**
 * Home / Dashboard Page
 * 
 * Main interface for the current day's schedule and timer.
 * Features circular timer, task list, control panel, and AI insights.
 * 
 * TODO: Connect to real-time data from Supabase
 * TODO: Add WebSocket support for live updates
 * TODO: Add keyboard shortcuts
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CircularTimer from '@/components/CircularTimer';
import TaskList from '@/components/TaskList';
import ControlPanel from '@/components/ControlPanel';
import AIWidget from '@/components/AIWidget';
import ErrorMessage from '@/components/ErrorMessage';
import { getCurrentBlock, getEnergyMessage, formatRange, getBlockTheme } from '@/lib/time';
import { EnergyLevel, TaskItem } from '@/lib/types';

export default function HomePage() {
  const [currentBlock, setCurrentBlock] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [currentTask] = useState('Deep Work Session');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('high');
  const [error, setError] = useState<string | null>(null);

  // Mock task data
  const [tasks] = useState<TaskItem[]>([
    {
      label: 'Deep Work - Project Alpha',
      range: '6:30 AM – 12:00 PM',
      energy: 'high',
      done: false
    },
    {
      label: 'Team Meetings & Calls',
      range: '12:00 PM – 6:00 PM',
      energy: 'medium',
      done: false
    },
    {
      label: 'Planning & Review',
      range: '6:00 PM – 10:00 PM',
      energy: 'low',
      done: false
    }
  ]);

  // Update current block and energy level based on time
  useEffect(() => {
    const updateCurrentBlock = () => {
      const block = getCurrentBlock();
      setCurrentBlock(block);
      
      // Set energy level based on block
      const energyMap: Record<string, EnergyLevel> = {
        morning: 'high',
        afternoon: 'medium',
        night: 'low'
      };
      setEnergyLevel(energyMap[block]);
    };

    updateCurrentBlock();
    const interval = setInterval(updateCurrentBlock, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Mock timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          return 25 * 60; // Reset to 25 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTaskComplete = () => {
    setTimeRemaining(25 * 60); // Reset timer
    // TODO: Mark task as completed in database
    console.log('Task completed!');
  };

  const handleControlAction = (action: string) => {
    // TODO: Implement actual control actions
    console.log(`Control action: ${action}`);
  };

  return (
    <div className={`min-h-screen ${getBlockTheme(currentBlock)}`}>
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Good {currentBlock === 'morning' ? 'Morning' : currentBlock === 'afternoon' ? 'Afternoon' : 'Evening'}!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {getEnergyMessage(energyLevel)}
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-medium text-gray-700">Current Block:</span>
            <span className="text-sm font-semibold text-gray-900 capitalize">
              {currentBlock} • {formatRange('06:00', '12:00')}
            </span>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Task List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6">
              <TaskList items={tasks} />
            </div>
          </motion.div>

          {/* Center - Timer and Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-6"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Current Task
                </h2>
                <p className="text-gray-600">
                  {currentTask}
                </p>
              </div>

              <CircularTimer
                currentTask={currentTask}
                timeRemainingSec={timeRemaining}
                energyLevel={energyLevel}
                onComplete={handleTaskComplete}
              />

              <div className="mt-8">
                <ControlPanel
                  onStart={() => handleControlAction('start')}
                  onPause={() => handleControlAction('pause')}
                  onResume={() => handleControlAction('resume')}
                  onStop={() => handleControlAction('stop')}
                  onReset={() => handleControlAction('reset')}
                  error={error}
                />
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar - AI Insights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="lg:col-span-3"
          >
            <AIWidget />
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">4h 32m</div>
            <div className="text-sm text-gray-600">Total Focus Today</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
            <div className="text-sm text-gray-600">Sessions Completed</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-6 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">87%</div>
            <div className="text-sm text-gray-600">Focus Rate</div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
