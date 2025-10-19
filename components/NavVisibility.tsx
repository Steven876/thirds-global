'use client';

import { usePathname } from 'next/navigation';
import FloatingNav from '@/components/FloatingNav';

export default function NavVisibility() {
  const pathname = usePathname();
  if (pathname?.startsWith('/login')) return null;
  return <FloatingNav />;
}


