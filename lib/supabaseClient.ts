/**
 * Supabase client (browser-safe)
 *
 * Exposes an anon-key client for client-side usage.
 * Server-side code should use lib/supabase/server.
 */

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Server helpers for API routes: create a request-scoped client with optional Bearer token
export function getSupabaseFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : undefined;

  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  });

  return client;
}

