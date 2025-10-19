'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const items = [
  { name: 'Home', href: '/home' },
  { name: 'Schedule', href: '/schedule' },
  { name: 'Reports', href: '/reports' }
];

export default function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="fixed top-4 left-4 z-50">
      <nav className="rounded-full bg-white/75 backdrop-blur-md border border-white/30 shadow-md">
        <ul className="flex items-center space-x-1 px-2 py-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-full text-gray-700 hover:text-gray-900 hover:bg-white/80"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}


