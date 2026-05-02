'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Activity as ActivityIcon,
  ArrowUpRight,
  Flame,
  Swords,
  Users,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import BugReportSection from '@/components/dashboard/BugReportSection';
import VisualAnalytics from '@/components/dashboard/VisualAnalytics';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats(), 
      api.getWeeklyStats(),
      api.getDistribution(),
      api.getGenreStats(),
      api.get('/api/social/activity').catch(() => [])
    ])
      .then(([s, w, d, g, a]) => { 
        setStats(s); 
        setWeekly(w); 
        setDistribution(d);
        setGenres(g);
        setActivity(Array.isArray(a) ? a : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!weekly) return [];
    return weekly;
  }, [weekly]);

  return (
    <div className="space-y-10 pb-12">
      {/* ── Dynamic Header ── */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#8b5cf6]/20 via-[#0c0c1d] to-[#030308] border border-[#8b5cf6]/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8b5cf6]/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#c084fc] text-[10px] font-black uppercase tracking-widest"
            >
              <Sparkles className="w-3 h-3" /> System Operational
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none"
            >
              Welcome back, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] to-[#8b5cf6]">Vault Commander.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 font-medium max-w-md"
            >
              Your personal library and global activity are synced and ready for action.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex items-center gap-6"
          >
            <div className="text-center">
              <p className="text-3xl font-black text-white">{stats?.totalGames || 0}</p>
              <p className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-widest">Library</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-black text-white">{Math.floor((stats?.totalPlaytime || 0) / 3600)}h</p>
              <p className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-widest">Experience</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Stats Carousel/Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              label="Today's Grind"
              value={Math.round((stats?.playtimeToday || 0) / 60)}
              suffix="m"
              icon={<TrendingUp className="w-5 h-5" />}
              color="#fbbf24"
              delay={0.4}
            />
            <StatCard
              label="Weekly Pulse"
              value={Math.floor((stats?.playtimeWeek || 0) / 3600)}
              suffix="h"
              icon={<ActivityIcon className="w-5 h-5" />}
              color="#34d399"
              delay={0.5}
            />
            <StatCard
              label="Trophies"
              value={stats?.totalAchievements || 0}
              suffix=""
              icon={<Trophy className="w-5 h-5" />}
              color="#60a5fa"
              delay={0.6}
            />
            <StatCard
              label="Vault Ranking"
              value={stats?.rank || 'S'}
              suffix=""
              icon={<Zap className="w-5 h-5" />}
              color="#c084fc"
              delay={0.7}
            />
          </>
        )}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
      {/* ── Visual Analytics ── */}
      <div className="xl:col-span-2">
        <VisualAnalytics 
          playtimeDistribution={distribution}
          genreDistribution={genres}
          weeklyPlaytime={chartData}
          loading={loading}
        />
      </div>

        {/* Global Social Feed */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-panel flex flex-col h-full overflow-hidden"
        >
          <div className="p-8 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Social Vault</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Activity Feed</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <AnimatePresence>
              {activity.slice(0, 15).map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] p-[1.5px] shrink-0">
                    <div className="w-full h-full rounded-[9px] bg-[#0c0c1d] flex items-center justify-center font-black text-xs text-white uppercase">
                      {act.user.username[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-tight">
                      <span className="font-black text-white group-hover:text-[#c084fc] transition-colors">{act.user.username}</span>
                      <span className="text-slate-500 mx-1">is now playing</span>
                      <span className="font-black text-white italic">{JSON.parse(act.metadata || '{}').gameTitle || 'a game'}</span>
                    </p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatDate(act.createdAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
              {activity.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <Users className="w-12 h-12 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No Activity Yet</p>
                 </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Most Played & Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="xl:col-span-2 glass-panel p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Legendary Collection</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {(stats?.mostPlayed || []).map((item: any, i: number) => (
               <motion.div
                 whileHover={{ scale: 1.02 }}
                 key={item.game.id}
                 className="flex items-center gap-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group relative overflow-hidden"
               >
                 <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b5cf6]/5 blur-2xl group-hover:bg-[#8b5cf6]/10 transition-all" />
                 <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-2xl relative z-10">
                    <SafeImage src={item.game.coverUrl} alt={item.game.title} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-sm font-black text-white truncate group-hover:text-[#c084fc] transition-colors">{item.game.title}</p>
                    <p className="text-2xl font-black text-white mt-1 italic leading-none">{Math.floor(item.totalPlaytime / 3600)}<span className="text-xs text-[#8b5cf6] not-italic ml-1">HOURS</span></p>
                 </div>
                 <div className="text-[10px] font-black text-slate-700 uppercase vertical-text border-l border-white/5 pl-2 h-full flex items-center">
                    MOST PLAYED
                 </div>
               </motion.div>
             ))}
          </div>
        </motion.div>

        {/* Recent Performance */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-[#c084fc]/10 text-[#c084fc]">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Recent Heat</h2>
          </div>

          <div className="space-y-3">
             {(stats?.recentSessions || []).slice(0, 5).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all">
                   <div className="min-w-0">
                      <p className="text-[13px] font-black text-white truncate">{session.gameName}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{formatDate(session.startTime)}</p>
                   </div>
                   <div className="text-right ml-4">
                      <p className="text-sm font-black text-[#c084fc]">{formatPlaytime(session.duration)}</p>
                   </div>
                </div>
             ))}
          </div>
        </motion.div>

      </div>

      {/* Bug Report Section */}
      <div className="max-w-4xl mx-auto">
        <BugReportSection />
      </div>
    </div>
  );
}

