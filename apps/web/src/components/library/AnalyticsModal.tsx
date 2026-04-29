'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trophy, BarChart3, Calendar, Play, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { GamingLoader } from '../ui/GamingLoader';
import { formatPlaytime } from '@/lib/utils';

interface AnalyticsModalProps {
  gameId: string;
  onClose: () => void;
  onLaunch: () => void;
}

export default function AnalyticsModal({ gameId, onClose, onLaunch }: AnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [liveSession, setLiveSession] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getGameStats(gameId);
        setStats(data);
        if (data.isRunning) {
          setIsRunning(true);
          setLiveSession(data.currentSessionDuration);
        }
      } catch (err) {
        console.error('Failed to fetch game stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [gameId]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setLiveSession(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030308]/90 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0c0c1d] border border-[#8b5cf6]/20 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7),0_0_50px_rgba(139,92,246,0.1)] overflow-hidden"
      >
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-[#8b5cf6]/20 to-[#c084fc]/10 flex items-end p-6 overflow-hidden">
          <div className="absolute inset-0 bg-[#0c0c1d]/40" />
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 rounded-full bg-[#030308]/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {stats?.gameTitle || 'Game Analytics'}
              </h2>
              <p className="text-[#8b5cf6] text-xs font-bold uppercase tracking-widest">Performance & Statistics</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="py-20">
              <GamingLoader message="Calculating stats..." />
            </div>
          ) : stats ? (
            <div className="space-y-8">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={<Clock className="w-5 h-5 text-[#8b5cf6]" />}
                  label="Total Playtime"
                  value={formatPlaytime(stats.totalPlaytime + (isRunning ? liveSession : 0))}
                  subValue="All time"
                />
                <StatCard 
                  icon={<Calendar className="w-5 h-5 text-[#34d399]" />}
                  label="Played Today"
                  value={formatPlaytime(stats.playtimeToday + (isRunning ? liveSession : 0))}
                  subValue="Last 24 hours"
                />
                <StatCard 
                  icon={<Clock className={`w-5 h-5 ${isRunning ? 'text-[#34d399] animate-pulse' : 'text-[#64748b]'}`} />}
                  label="Current Session"
                  value={isRunning ? formatPlaytime(liveSession) : 'Inactive'}
                  subValue={isRunning ? 'Live Tracking' : 'Not running'}
                  isLive={isRunning}
                />
                <StatCard 
                  icon={<Trophy className="w-5 h-5 text-[#fbbf24]" />}
                  label="Achievements"
                  value={`${stats.achievements.earned} / ${stats.achievements.total}`}
                  subValue={`${stats.achievements.percentage}% Complete`}
                  progress={stats.achievements.percentage}
                />
              </div>

              {/* Weekly Insight */}
              <div className="glass-panel p-6 border-[#8b5cf6]/10 bg-[#8b5cf6]/03">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Weekly Activity</h3>
                </div>
                <div className="flex items-end gap-2 h-16 px-2">
                  {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#8b5cf6]/10 rounded-t-md overflow-hidden group relative">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className="w-full bg-gradient-to-t from-[#8b5cf6] to-[#c084fc] absolute bottom-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-bold text-[#475569] uppercase tracking-tighter">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>

              {/* Recent Achievements */}
              {stats.achievements.list.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#64748b] uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-3 h-3" />
                    Top Achievements
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {stats.achievements.list.map((ach: any) => (
                      <div key={ach.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#030308]/40 border border-[#8b5cf6]/05 hover:border-[#8b5cf6]/15 transition-colors">
                        <div className={`p-2 rounded-lg ${ach.isEarned ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-white/5 text-white/20'}`}>
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white leading-tight">{ach.name}</p>
                          <p className="text-[10px] text-[#475569] truncate max-w-[400px]">{ach.description || 'No description available'}</p>
                        </div>
                        {ach.isEarned && (
                          <div className="text-[10px] font-black text-[#34d399] uppercase tracking-widest px-2 py-1 rounded bg-[#34d399]/10">
                            Earned
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#8b5cf6]/10">
                <button 
                  onClick={onLaunch}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Launch Game
                </button>
                <button 
                  onClick={onClose}
                  className="px-6 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-[#64748b]">Failed to load analytics for this game.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, subValue, progress, isLive }: any) {
  return (
    <div className={`p-4 rounded-xl bg-[#030308]/60 border relative overflow-hidden group transition-all duration-500 ${isLive ? 'border-[#34d399]/40 shadow-[0_0_20px_rgba(52,211,153,0.1)]' : 'border-[#8b5cf6]/10'}`}>
      {isLive && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[8px] font-black text-[#34d399] uppercase tracking-widest">Live</span>
        </div>
      )}
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-lg font-black text-white">{value}</h4>
      <p className="text-[10px] font-bold text-[#8b5cf6]/60 mt-1">{subValue}</p>
      
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]"
          />
        </div>
      )}
    </div>
  );
}
