/**
 * Navbar Component
 * 
 * Main navigation component for the Thirds app.
 * Features logo, navigation links, and user profile section.
 * 
 * TODO: Wire up Supabase Auth for user authentication
 * TODO: Add mobile menu for responsive design
 * TODO: Add user profile dropdown
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, User, Home, Calendar, BarChart3, Menu } from 'lucide-react';
import { useState } from 'react';
import OrbitalThirdsLogo from './OrbitalThirdsLogo';

const navigation = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Navbar({ onToggleInsights }: { onToggleInsights?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <OrbitalThirdsLogo size={32} variant="horizontal" theme="light" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Section: Burger + Settings + User */}
          <div className="flex items-center space-x-4">
            {/* Burger to toggle AI side panel */}
            <button
              onClick={() => {
                setOpen(!open);
                onToggleInsights?.();
              }}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors md:hidden"
              aria-label="Toggle insights drawer"
            >
              <Menu className="h-6 w-6" />
            </button>
            {/* TODO: Replace with actual user data from Supabase Auth */}
            
            
            <Link
              href="/settings"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            
            <button
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="User profile"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
