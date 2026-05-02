'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import VisualAnalytics from '@/components/dashboard/VisualAnalytics';
import { GamingLoader } from '@/components/ui/GamingLoader';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Calendar, 
  ChevronRight,
  Sparkles,
  BarChart3,
  Search,
  Filter
} from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.getWeeklyStats(),
      api.getDistribution(),
      api.getGenreStats(),
      api.getStats()
    ])
      .then(([w, d, g, s]) => {
        setWeekly(w);
        setDistribution(d);
        setGenres(g);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <GamingLoader />;

  return (
    <div className="space-y-10 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-[#c084fc] text-[10px] font-black uppercase tracking-[0.3em]"
          >
            <BarChart3 className="w-3 h-3" /> Deep Forensic Analytics
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-white tracking-tighter"
          >
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] to-[#8b5cf6]">Vault Intelligence</span>
          </motion.h1>
        </div>

        <div className="flex items-center gap-3">
           <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-black text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Last 14 Days
           </button>
           <button className="px-4 py-2 rounded-xl bg-[#8b5cf6] text-xs font-black text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filter Data
           </button>
        </div>
      </div>

      {/* ── Main Analytical Suite ── */}
      <VisualAnalytics 
        playtimeDistribution={distribution}
        genreDistribution={genres}
        weeklyPlaytime={weekly}
        loading={loading}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         {/* Session Frequency Chart */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="glass-panel p-8"
         >
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <Activity className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white italic">Session Consistency</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Engagement Density Map</p>
               </div>
            </div>

            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekly}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                     <XAxis dataKey="day" hide />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{ background: '#0c0c1d', border: '1px solid #10b98133', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                     />
                     <Area type="stepAfter" dataKey="minutes" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         {/* Historical Archetype Analysis */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ delay: 0.1 }}
           className="glass-panel p-8"
         >
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white italic">Gaming Archetype</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Behavioral Signature</p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                     <p className="text-sm font-black text-white uppercase tracking-widest">Consistency Score</p>
                     <p className="text-2xl font-black text-emerald-400">94.2%</p>
                  </div>
                  <div className="mt-4 w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
                     <div className="h-full bg-emerald-400 w-[94%]" />
                  </div>
               </div>

               <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                    "Your patterns indicate a <b>Weekend Warrior</b> archetype. You concentrate 65% of your total playtime between Friday evening and Sunday night, with a preference for long, marathon-style sessions in Action titles."
                  </p>
               </div>
            </div>
         </motion.div>
      </div>
    </div>
  );
}
