import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/gradients.css";
import NavVisibility from '@/components/NavVisibility';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
  weight: ['300','400','500','600','700']
});

export const metadata: Metadata = {
  title: "Thirds - Structure your day around your energy",
  description: "Optimize your productivity by organizing your day into three energy-based blocks: morning, afternoon, and night.",
  keywords: "productivity, time management, energy optimization, focus, scheduling",
  authors: [{ name: "Thirds Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen">
        <NavVisibility />
        {children}
      </body>
    </html>
  );
}
