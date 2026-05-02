'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Activity, 
  Gamepad2, 
  TrendingUp,
  Layout
} from 'lucide-react';

interface VisualAnalyticsProps {
  playtimeDistribution: any[];
  genreDistribution: any[];
  weeklyPlaytime: any[];
  loading?: boolean;
}

const COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#f472b6', '#fb7185', '#fda4af', '#fecdd3'];

export default function VisualAnalytics({ 
  playtimeDistribution, 
  genreDistribution, 
  weeklyPlaytime,
  loading 
}: VisualAnalyticsProps) {
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <div key={i} className="glass-panel h-[400px] animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Playtime Distribution Pie Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass-panel p-8 group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-[#8b5cf6]/10 transition-all" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-[#8b5cf6]/10 text-[#c084fc]">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight italic">Vault Dominance</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Playtime Share per Game</p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={playtimeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                animationDuration={1500}
                stroke="none"
              >
                {playtimeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#0c0c1d', 
                  border: '1px solid rgba(139,92,246,0.2)', 
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}
                formatter={(value: any) => [`${value} Hours`, 'Time Invested']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Genre Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-8 group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d946ef]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-[#d946ef]/10 transition-all" />

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-[#d946ef]/10 text-[#f472b6]">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight italic">Genre Spectrum</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Library Diversity Analysis</p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genreDistribution} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#0c0c1d', 
                  border: '1px solid rgba(217,70,239,0.2)', 
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(217,70,239,0.05)' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}
                formatter={(value: any) => [`${value} Games`, 'Collection Size']}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 10, 10, 0]}
                animationDuration={1500}
              >
                {genreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Playtime Heatmap-style Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2 glass-panel p-8 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6]/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight italic">Momentum Engine</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">High-Fidelity Engagement Flow</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white uppercase tracking-widest">
            Last 7 Sessions
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyPlaytime}>
              <defs>
                <linearGradient id="colorPlaytime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="day" 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                axisLine={false}
                tickLine={false}
                unit="m"
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#0c0c1d', 
                  border: '1px solid rgba(139,92,246,0.2)', 
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}
              />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                stroke="#8b5cf6" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorPlaytime)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
