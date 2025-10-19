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

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import ScheduleGuard from '@/components/ScheduleGuard';
import ErrorMessage from '@/components/ErrorMessage';
import { getCurrentBlock, getBlockTheme, getEnergyThemeForNow } from '@/lib/time';
import { supabase } from '@/lib/supabaseClient';

type EnergyKey = 'High' | 'Medium' | 'Low';

export default function ReportsPage() {
  const [currentBlock, setCurrentBlock] = useState<'morning' | 'afternoon' | 'night'>(getCurrentBlock());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'today' | 'this_week' | 'last_week'>('today');
  const [stats, setStats] = useState<{
    totalSessions: number;
    totalTasks: number;
    completedTasks: number;
    totalFocusMinutes: number;
    avgTaskMinutes: number;
    energyDurations: Record<EnergyKey, number>;
    energyCounts: Record<EnergyKey, number>;
    completedByEnergy: Record<EnergyKey, number>;
    blocks: Array<{ energy: EnergyKey; start: string; end: string }>;
    suggestions: string[];
  }>({
    totalSessions: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalFocusMinutes: 0,
    avgTaskMinutes: 0,
    energyDurations: { High: 0, Medium: 0, Low: 0 },
    energyCounts: { High: 0, Medium: 0, Low: 0 },
    completedByEnergy: { High: 0, Medium: 0, Low: 0 },
    blocks: [],
    suggestions: []
  });

  useEffect(() => {
    const id = setInterval(() => setCurrentBlock(getCurrentBlock()), 60000);
    return () => clearInterval(id as unknown as number);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (!uid) throw new Error('Not authenticated');

        const weekday = new Date().toLocaleString('en-US', { weekday: 'long' });
        const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

        let sessions: any[] = [];
        if (range === 'today') {
          const { data: schedule } = await supabase
            .from('schedules')
            .select(`
              id,
              sessions (
                id,
                template:session_templates!inner ( id, energy_type, start_time, end_time ),
                tasks ( id, status, duration_minutes )
              )
            `)
            .eq('user_id', uid)
            .eq('day_of_week', weekday)
            .single();
          sessions = (schedule?.sessions as any[]) || [];
        } else {
          const { data: schedules } = await supabase
            .from('schedules')
            .select(`
              id,
              day_of_week,
              sessions (
                id,
                template:session_templates!inner ( id, energy_type, start_time, end_time ),
                tasks ( id, status, duration_minutes )
              )
            `)
            .eq('user_id', uid)
            .in('day_of_week', daysOfWeek);
          const arr = Array.isArray(schedules) ? schedules : [];
          sessions = arr.flatMap(s => (s.sessions as any[]) || []);
        }

        const energyCounts: Record<EnergyKey, number> = { High: 0, Medium: 0, Low: 0 };
        const energyDurations: Record<EnergyKey, number> = { High: 0, Medium: 0, Low: 0 };
        const completedByEnergy: Record<EnergyKey, number> = { High: 0, Medium: 0, Low: 0 };
        let totalTasks = 0;
        let completedTasks = 0;
        let totalFocusMinutes = 0;
        const blocks: Array<{ energy: EnergyKey; start: string; end: string }> = [];
        sessions.forEach((s: any) => {
          const energy = (s.template?.energy_type || 'Low') as EnergyKey;
          energyCounts[energy] += 1;
          blocks.push({ energy, start: s.template?.start_time || '00:00', end: s.template?.end_time || '00:00' });
          const tasks = (s.tasks as any[]) || [];
          totalTasks += tasks.length;
          tasks.forEach(t => {
            if (t.status === 'completed') {
              completedTasks += 1;
              completedByEnergy[energy] += 1;
            }
            const dur = Number(t.duration_minutes || 0);
            totalFocusMinutes += dur;
            energyDurations[energy] += dur;
          });
        });
        const avgTaskMinutes = totalTasks > 0 ? totalFocusMinutes / totalTasks : 0;

        // AI suggestions (auth required)
        let suggestions: string[] = [];
        try {
          const token = sessionData.session?.access_token;
          const res = await fetch('/api/insights', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          const js = await res.json();
          if (js?.ok && Array.isArray(js?.data?.suggestions)) suggestions = js.data.suggestions;
          else if (Array.isArray(js)) suggestions = js; // fallback if API returns array
        } catch {}

        setStats({
          totalSessions: sessions.length,
          totalTasks,
          completedTasks,
          totalFocusMinutes,
          avgTaskMinutes,
          energyDurations,
          energyCounts,
          completedByEnergy,
          blocks: blocks.sort((a, b) => (a.energy === 'High' ? 0 : a.energy === 'Medium' ? 1 : 2) - (b.energy === 'High' ? 0 : b.energy === 'Medium' ? 1 : 2)),
          suggestions
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  const completionRate = useMemo(() => stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0, [stats.completedTasks, stats.totalTasks]);

  function Proposals() {
    const [proposals, setProposals] = useState<Array<{ type: 'shift_high_block'; target: { start: string; end: string }; rationale: string }>>([]);
    const [confirming, setConfirming] = useState<{ start: string; end: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [info, setInfo] = useState<string | null>(null);

    useEffect(() => {
      const load = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          const res = await fetch('/api/insights', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          const js = await res.json();
          if (js?.ok && Array.isArray(js?.data?.proposals)) setProposals(js.data.proposals);
          else setProposals([]);
        } catch {
          setProposals([]);
        }
      };
      load();
  }, []);

    const apply = async (target: { start: string; end: string }) => {
      try {
        setBusy(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ type: 'shift_high_block', target })
        });
        const js = await res.json();
        if (!res.ok || !js?.ok) throw new Error(js?.error || 'Failed to apply proposal');
        setInfo('High energy block updated.');
        setTimeout(() => setInfo(null), 2500);
        setConfirming(null);
      } catch (e: any) {
        setInfo(e?.message || 'Failed to apply proposal');
        setTimeout(() => setInfo(null), 3000);
      } finally {
        setBusy(false);
      }
    };

    if (proposals.length === 0) return null;
    return (
      <div>
        <div className="font-medium text-slate-900 mb-2">Proposed Schedule Updates</div>
        <div className="space-y-3">
          {proposals.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-white/30 bg-white/70 p-3">
              <div className="text-sm text-slate-800 mb-2">{p.rationale}</div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-700">Shift High block to <span className="font-medium text-slate-900">{p.target.start} – {p.target.end}</span></div>
                <button onClick={() => setConfirming(p.target)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={busy}>Apply</button>
              </div>
            </div>
          ))}
        </div>

        {confirming && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="rounded-2xl bg-white p-6 max-w-md w-full">
              <div className="text-lg font-semibold text-slate-900 mb-2">Apply schedule update?</div>
              <div className="text-slate-700 mb-4">This will set your High energy block to {confirming.start} – {confirming.end}. You can change it later in Schedule.</div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirming(null)} className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100">Cancel</button>
                <button onClick={() => apply(confirming)} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={busy}>Confirm</button>
              </div>
              {info && <div className="mt-3 text-sm text-slate-700">{info}</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <AuthGuard>
      <ScheduleGuard>
      <div className={`min-h-screen gradient-transition animated-gradient ${getBlockTheme(currentBlock)} relative overflow-hidden`}>
        <div className="grain-overlay"></div>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white/50 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-white/40 border border-white/30" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-white/40 border border-white/30" />
              ))}
            </div>
            <div className="h-28 rounded-2xl bg-white/50 border border-white/30" />
          </div>
        </main>
      </div>
      </ScheduleGuard>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
    <ScheduleGuard>
    <div className={`min-h-screen gradient-transition ${getBlockTheme(currentBlock)} relative overflow-hidden`}>
      <div className="grain-overlay"></div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Reports & Insights</h1>
          <p className="text-slate-700">Your day at a glance</p>
        </motion.div>
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-full bg-white/70 backdrop-blur-sm border border-white/30 p-1">
            <button onClick={() => setRange('today')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${range==='today' ? 'bg-blue-600 text-white' : 'text-slate-800 hover:bg-white/80'}`}>Today</button>
            <button onClick={() => setRange('this_week')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${range==='this_week' ? 'bg-blue-600 text-white' : 'text-slate-800 hover:bg-white/80'}`}>This Week</button>
            <button onClick={() => setRange('last_week')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${range==='last_week' ? 'bg-blue-600 text-white' : 'text-slate-800 hover:bg-white/80'}`}>Last Week</button>
          </div>
          </div>
          
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-sm border border-white/30">
            <div className="text-xs text-slate-600">Total Sessions</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalSessions > 0 ? stats.totalSessions : 'null'}</div>
          </div>
          <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-sm border border-white/30">
            <div className="text-xs text-slate-600">Focus Time</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalTasks > 0 ? `${Math.floor(stats.totalFocusMinutes/60)}h ${stats.totalFocusMinutes%60}m` : 'null'}</div>
          </div>
          <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-sm border border-white/30">
            <div className="text-xs text-slate-600">Tasks Completed</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalTasks > 0 ? `${stats.completedTasks}/${stats.totalTasks}` : 'null'}</div>
            </div>
          <div className="rounded-2xl p-4 bg-white/70 backdrop-blur-sm border border-white/30">
            <div className="text-xs text-slate-600">Completion Rate</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalTasks > 0 ? `${completionRate}%` : 'null'}</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(['High','Medium','Low'] as const).map((energy) => {
            const tasksDone = stats.completedByEnergy[energy];
            const focusMinutes = Math.round(stats.energyDurations[energy]);
            return (
              <div key={energy} className={`rounded-2xl p-4 backdrop-blur-sm border ${energy==='High'?'bg-emerald-50/70 border-emerald-200':energy==='Medium'?'bg-amber-50/70 border-amber-200':'bg-rose-50/70 border-rose-200'}`}>
                <div className="font-semibold text-slate-900">{energy} Energy</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="text-slate-700">Tasks Done</div>
                  <div className="font-medium text-slate-900">{tasksDone > 0 ? tasksDone : 0}</div>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <div className="text-slate-700">Focus Time</div>
                  <div className="font-medium text-slate-900">{focusMinutes > 0 ? `${focusMinutes}m` : 'null'}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="rounded-2xl p-6 bg-white/80 border border-white/30">
          <div className="font-semibold text-slate-900 mb-3">AI Recommendations</div>
          {stats.suggestions.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-slate-800 mb-4">
              {stats.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <div className="text-slate-600 mb-4">No recommendations yet. Complete some sessions to generate insights.</div>
          )}

          {/* Proposed schedule updates */}
          <Proposals />
        </motion.div>
      </main>
    </div>
    </ScheduleGuard>
    </AuthGuard>
  );
}
