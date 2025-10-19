'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ScheduleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        // AuthGuard should handle auth redirect; just wait here
        return;
      }
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_id', uid)
        .limit(1);
      if (!schedules || schedules.length === 0) {
        router.replace('/schedule');
        return;
      }
      setChecked(true);
    };
    check();
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}


