'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  LayoutDashboard,
  Library,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  Swords,
  Sparkles,
  Users,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Game Library', icon: Library, path: '/library' },
  { label: 'Trophies', icon: Trophy, path: '/trophies' },
  { label: 'Analytics', icon: TrendingUp, path: '/analytics' },
  { label: 'Challenges', icon: Sparkles, path: '/challenges' },
  { label: 'Social', icon: Users, path: '/social' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar flex flex-col">
      {/* ── Brand Header ── */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/dashboard" className="flex items-center gap-3 group no-underline">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-10 h-10 rounded-xl gradient-vivid flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_35px_rgba(139,92,246,0.6)] transition-shadow"
          >
            <Gamepad2 className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight uppercase text-white">
              GameVault
            </span>
            <span className="text-[9px] font-bold text-[#8b5cf6] uppercase tracking-[0.2em] -mt-0.5">
              Player Hub
            </span>
          </div>
        </Link>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/20 to-transparent mb-5" />

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="px-3 text-[9px] font-extrabold text-[#8b5cf6]/50 uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
          <Swords className="w-3 h-3" />
          Command Center
        </p>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
          return (
            <Link key={item.path} href={item.path} className="no-underline">
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`relative flex items-center justify-between p-2.5 px-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8b5cf6]/15 to-[#a855f7]/08 text-white border border-[#8b5cf6]/20 shadow-[0_0_20px_rgba(139,92,246,0.06)]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#8b5cf6]/06 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#8b5cf6]/20 text-[#c084fc]' 
                      : 'text-[#64748b] group-hover:text-[#a78bfa] group-hover:bg-white/[0.03]'
                  }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-bold">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#c084fc] to-[#8b5cf6] shadow-[0_0_12px_#8b5cf6]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30 transition-opacity" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── Pro Badge ── */}
      <div className="px-4 mb-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#8b5cf6]/10 to-[#6d28d9]/05 border border-[#8b5cf6]/15 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#8b5cf6]/15">
            <Sparkles className="w-4 h-4 text-[#c084fc]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold text-white truncate">Desktop Tracker</p>
            <p className="text-[9px] font-bold text-[#8b5cf6]/60 uppercase tracking-wider">Active</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/15 to-transparent mb-3" />

      {/* ── User Module ── */}
      <div className="px-4 pb-5">
        <div className="p-3 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/08 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] p-[2px] shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0">
              <div className="w-full h-full rounded-[10px] bg-[#08081a] flex items-center justify-center font-black text-xs text-[#c084fc] uppercase">
                {user?.username?.[0] || 'G'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-white">{user?.username || 'Player'}</p>
              <p className="text-[9px] font-bold text-[#8b5cf6]/50 truncate uppercase tracking-wide">Vault Member</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Link 
              href="/profile" 
              className="flex items-center justify-center p-2 rounded-lg bg-white/[0.03] hover:bg-[#8b5cf6]/10 transition-all group border border-transparent hover:border-[#8b5cf6]/15"
            >
              <Settings className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#c084fc] transition-colors" />
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-lg bg-red-500/[0.06] hover:bg-red-500/15 transition-all group border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5 text-[#64748b] group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
