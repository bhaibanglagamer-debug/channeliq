'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  Users,
  Sparkles,
  Radio,
  Lightbulb,
  Sun,
  Moon,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { href: '/whats-working', label: "What's Working", icon: TrendingUp },
  { href: '/competitors', label: 'Competitors', icon: Users },
  { href: '/idea-generator', label: 'Idea Generator', icon: Sparkles },
  { href: '/trend-radar', label: 'Trend Radar', icon: Radio },
  { href: '/idea-bank', label: 'Idea Bank', icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.5)',
            }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">ChannelIQ</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Creator Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          Analytics
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'nav-active text-violet-300'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive
                  ? 'bg-violet-600/30 text-violet-400'
                  : 'bg-white/[0.04] text-gray-500 group-hover:text-gray-300'
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] w-full transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </div>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(9,9,18,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: '0 0 12px rgba(124, 58, 237, 0.5)',
            }}
          >
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">ChannelIQ</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/60"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 h-screen w-64 z-30 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, #0e0e1c 0%, #090912 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-60 shrink-0 h-screen fixed left-0 top-0 flex-col z-10"
        style={{
          background: 'linear-gradient(180deg, #0e0e1c 0%, #090912 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
