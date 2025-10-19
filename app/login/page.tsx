'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentBlock, getBlockTheme } from '@/lib/time';
import OrbitalThirdsLogo from '@/components/OrbitalThirdsLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<'morning' | 'afternoon' | 'night'>(getCurrentBlock());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { username }
          }
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (userId) {
          await supabase.from('users').upsert({ id: userId, username });
        }
        // Show confirmation notice and keep user on page
        setInfo('Check your email to confirm your account to continue.');
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // After login, route based on whether a schedule exists
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) {
        const { data: existing } = await supabase
          .from('schedules')
          .select('id')
          .eq('user_id', uid)
          .limit(1);
        if (existing && existing.length > 0) {
          router.replace('/home');
        } else {
          router.replace('/schedule');
        }
      } else {
        router.replace('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        router.replace('/home');
      }
    };
    check();
  }, [router]);

  // Listen for email confirmation sign-in and ensure DB upsert, then route
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const metaUsername = (session.user as any)?.user_metadata?.username || username || null;
        await supabase.from('users').upsert({ id: session.user.id, username: metaUsername });
        router.replace('/home');
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, username]);

  // Keep background theme in sync with real time
  useEffect(() => {
    const tick = () => setCurrentBlock(getCurrentBlock());
    const id = setInterval(tick, 60000);
    return () => clearInterval(id as unknown as number);
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center gradient-transition animated-gradient ${getBlockTheme(currentBlock)} relative overflow-hidden px-4`}>
      <div className="grain-overlay"></div>
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3">
            <OrbitalThirdsLogo size={48} variant="icon" theme="light" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Thirds</h1>
            <p className="text-sm text-slate-700">Structure your day around your energy</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/30 shadow-xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          {info && (
            <div className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">{info}</div>
          )}
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/90 text-slate-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/90 text-slate-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/90 text-slate-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>
        <div className="mt-4 text-sm text-slate-700">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button className="underline" onClick={() => setMode('login')}>Log in</button>
            </span>
          ) : (
            <span>
              New here?{' '}
              <button className="underline" onClick={() => setMode('signup')}>Create an account</button>
            </span>
          )}
        </div>
        
        </div>
      </div>
    </div>
  );
}


