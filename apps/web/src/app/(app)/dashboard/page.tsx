'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatPlaytime, formatDate } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import { GamingLoader } from '@/components/ui/GamingLoader';
import { SkeletonStat } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  Clock,
  Gamepad2,
  Trophy,
  TrendingUp,
  Play,
  History,
  Activity,
  ArrowUpRight,
  Flame,
  Swords,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import BugReportSection from '@/components/dashboard/BugReportSection';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.getWeeklyStats()])
      .then(([s, w]) => { setStats(s); setWeekly(w); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!weekly?.days) return [];
    return weekly.days.map((d: any) => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: +(d.totalSeconds / 3600).toFixed(1),
    }));
  }, [weekly]);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/15">
              <Swords className="w-5 h-5 text-[#c084fc]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Dashboard
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#64748b] font-medium text-sm ml-[52px]"
          >
            Your gaming command center — all stats at a glance.
          </motion.p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <StatCard
              label="Total Playtime"
              value={Math.floor((stats?.totalPlaytime || 0) / 3600)}
              suffix="hrs"
              icon={<Clock className="w-5 h-5" />}
              color="#c084fc"
              delay={0.1}
            />
            <StatCard
              label="Today's Gaming"
              value={Math.round((stats?.playtimeToday || 0) / 60)}
              suffix="mins"
              icon={<TrendingUp className="w-5 h-5" />}
              color="#fbbf24"
              delay={0.2}
            />
            <StatCard
              label="This Week"
              value={Math.floor((stats?.playtimeWeek || 0) / 3600)}
              suffix="hrs"
              icon={<Activity className="w-5 h-5" />}
              color="#34d399"
              delay={0.3}
            />
            <StatCard
              label="Library Total"
              value={stats?.totalGames || 0}
              suffix="games"
              icon={<Gamepad2 className="w-5 h-5" />}
              color="#a855f7"
              delay={0.4}
            />
          </>
        )}
      </div>

      {/* ── Main Area ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Weekly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8b5cf6]/10 text-[#c084fc]">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white">Weekly Activity</h2>
            </div>
            <div className="text-[9px] font-extrabold text-[#8b5cf6]/40 uppercase tracking-[0.2em] bg-[#8b5cf6]/6 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/10">
              Last 7 Days
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(139,92,246,0.06)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                  dx={-5}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(139,92,246,0.04)', radius: 8 }}
                  contentStyle={{
                    background: '#0c0c1d',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 700, fontSize: '13px' }}
                  labelStyle={{ color: '#8b5cf6', marginBottom: '6px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em' }}
                  formatter={(value: any) => [`${value} hours`, 'Playtime']}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="hours"
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#a855f7]/10 text-[#c084fc]">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Recent Sessions</h2>
          </div>

          <div className="space-y-2">
            {(stats?.recentSessions || []).slice(0, 6).map((session: any, idx: number) => (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + idx * 0.08 }}
                key={session.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.015] border border-[#8b5cf6]/06 hover:bg-[#8b5cf6]/05 hover:border-[#8b5cf6]/15 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold group-hover:text-[#c084fc] transition-colors truncate text-white">{session.gameName}</p>
                  <p className="text-[9px] text-[#475569] font-bold uppercase tracking-wider mt-0.5">{formatDate(session.startTime)}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-[13px] font-black text-[#c084fc]">
                    {formatPlaytime(session.duration)}
                  </span>
                </div>
              </motion.div>
            ))}
            {(!stats?.recentSessions || stats.recentSessions.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/6 flex items-center justify-center mb-3 border border-[#8b5cf6]/10">
                  <History className="w-5 h-5 text-[#8b5cf6]/30" />
                </div>
                <p className="text-xs text-[#475569] font-medium">No recent sessions.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Hall of Fame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#fbbf24]/10 text-[#fbbf24]">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">Most Played</h2>
          </div>

          <div className="space-y-3">
            {(stats?.mostPlayed || []).map((item: any, i: number) => (
              <div
                key={item.game.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.015] border border-[#8b5cf6]/06 hover:bg-[#8b5cf6]/04 hover:border-[#8b5cf6]/12 transition-all group"
              >
                <div className="relative">
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md bg-[#0c0c1d] border border-[#8b5cf6]/20 flex items-center justify-center text-[9px] font-black text-[#c084fc] z-10">
                    {i + 1}
                  </div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg shrink-0 border border-[#8b5cf6]/08">
                    <SafeImage src={item.game.coverUrl} alt={item.game.title} className="w-full h-full" fallbackText={item.game.title[0]} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white group-hover:text-[#c084fc] transition-colors">{item.game.title}</p>
                  <p className="text-[9px] text-[#475569] font-bold uppercase tracking-wider mt-0.5">Playtime record</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black gradient-text">
                    {Math.floor(item.totalPlaytime / 3600)}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bug Report Panel */}
        <BugReportSection />
      </div>
    </div>
  );
}
