/**
 * Footer Component
 * 
 * Simple footer with legal links and branding.
 * 
 * TODO: Add actual legal pages
 * TODO: Add social media links
 * TODO: Add newsletter signup
 */

'use client';

import Link from 'next/link';
import OrbitalThirdsLogo from './OrbitalThirdsLogo';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and tagline */}
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <OrbitalThirdsLogo size={24} variant="icon" theme="light" />
            <span className="text-sm text-gray-600">
              Structure your day around your energy.
            </span>
          </div>

          {/* Legal links */}
          <div className="flex space-x-6 text-sm text-gray-500">
            <Link 
              href="/contact" 
              className="hover:text-gray-700 transition-colors"
            >
              Contact
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-gray-700 transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-gray-700 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          © 2024 Thirds. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
