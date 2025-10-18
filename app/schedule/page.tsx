/**
 * Schedule Builder Page
 * 
 * Interface for creating and managing daily schedules across energy blocks.
 * Features form for each block with time ranges, energy levels, and recurring patterns.
 * 
 * TODO: Add schedule templates
 * TODO: Add conflict detection
 * TODO: Add schedule sharing
 */

'use client';

import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScheduleForm from '@/components/ScheduleForm';

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ScheduleForm />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
