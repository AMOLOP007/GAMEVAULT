'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatPlaytime } from '@/lib/utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Clock, Target, TrendingUp } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PLAYING: '#34d399',
  COMPLETED: '#60a5fa',
  DROPPED: '#f87171',
  BACKLOG: '#fbbf24',
  WISHLIST: '#c084fc',
};

export default function AnalyticsPage() {
  const [games, setGames] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getGames(), 
      api.getWeeklyStats(),
      api.getDistribution(),
      api.getStats()
    ])
      .then(([g, w, d, s]) => { 
        setGames(g); 
        setWeekly(w); 
        setDistribution(d as any[]);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [stats, setStats] = useState<any>(null);

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    games.forEach((g) => {
      const status = (g.status || 'playing').toUpperCase();
      map[status] = (map[status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [games]);

  const areaData = useMemo(() => {
    if (!weekly) return [];
    // The API now returns [{ day, minutes }]
    return weekly.map((d: any) => ({
      date: d.day,
      hours: +(d.minutes / 60).toFixed(1),
    }));
  }, [weekly]);

  const totalPlaytime = useMemo(() => stats?.totalPlaytime || games.reduce((sum, g) => sum + g.totalPlaytime, 0), [games, stats]);
  const avgPerGame = games.length > 0 ? Math.floor(totalPlaytime / games.length) : 0;
  const completionRate = games.length > 0
    ? Math.round((games.filter((g) => (g.status || '').toUpperCase() === 'COMPLETED').length / games.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/15">
            <TrendingUp className="w-5 h-5 text-[#c084fc]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Analytics</h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#64748b] font-medium text-sm ml-[52px]"
        >
          Deep insights into your gaming patterns.
        </motion.p>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: 'Played Today', value: formatPlaytime(stats?.playtimeToday || 0), color: '#fbbf24' },
          { icon: Activity, label: 'This Week', value: formatPlaytime(stats?.playtimeWeek || 0), color: '#34d399' },
          { icon: Target, label: 'Completion', value: `${completionRate}%`, color: '#60a5fa' },
          { icon: Clock, label: 'Total Library', value: formatPlaytime(totalPlaytime), color: '#c084fc' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-5 text-center group hover:border-[#8b5cf6]/20 transition-all hover:-translate-y-1"
          >
            <stat.icon className="w-5 h-5 mx-auto mb-3 transition-colors" style={{ color: stat.color }} />
            <p className="text-xl font-black text-white mb-1 truncate">{stat.value}</p>
            <p className="text-[10px] text-[#475569] font-bold uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Playtime Trend ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel p-6"
      >
        <h2 className="text-lg font-bold mb-5 text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#c084fc]" />
          Playtime Trend (7 Days)
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip
                contentStyle={{
                  background: '#0c0c1d',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
              />
              <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Distribution Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6"
        >
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <PieIcon className="w-4 h-4 text-[#c084fc]" />
            Status Breakdown
          </h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0c0c1d',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-3">
            {statusDistribution.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] font-bold">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </motion.div>

        {/* Game Playtime Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel p-6"
        >
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <PieIcon className="w-4 h-4 text-[#8b5cf6]" />
            Game Distribution (Hours)
          </h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={entry.name} fill={[`#8b5cf6`, `#c084fc`, `#60a5fa`, `#34d399`, `#f59e0b`][index % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0c0c1d',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {distribution.map((d, i) => (
              <div key={d.name} className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: [`#8b5cf6`, `#c084fc`, `#60a5fa`, `#34d399`, `#f59e0b`][i % 5] }} />
                  <span className="text-[#94a3b8] font-bold truncate">{d.name}</span>
                </div>
                <span className="text-white font-black">{d.value}h</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Simple Activity icon replacement since we don't import it separately
function Activity({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}
