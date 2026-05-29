'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Target, Award, Zap, Star, Shield, Flame, Clock, Gamepad2, 
  ChevronRight, CheckCircle2, Lock, Sparkles, TrendingUp,
  Library, MessageSquare, Moon, Users, Edit3, RotateCcw, Bug, Map, Swords, Cloud, Crown
} from 'lucide-react';
import { api } from '@/lib/api';
import { GamingLoader } from '@/components/ui/GamingLoader';

type Tab = 'badges' | 'challenges';

export default function ChallengesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('challenges');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    const savedTab = sessionStorage.getItem('gv_progression_tab') as Tab;
    if (savedTab === 'challenges' || savedTab === 'badges') {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem('gv_progression_tab', tab);
  };
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [badgesData, challengesData] = await Promise.all([
          api.get<any[]>('/api/badges'),
          api.get<any[]>('/api/challenges')
        ]);
        setBadges(badgesData);
        setChallenges(challengesData);
      } catch (err) {
        console.error('Failed to fetch badges/challenges:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completedChallenges = useMemo(() => challenges.filter(c => c.status === 'COMPLETED').length, [challenges]);
  const unlockedBadges = useMemo(() => badges.filter(b => b.isUnlocked).length, [badges]);

  const dailyChallenges = useMemo(() => challenges.filter(c => c.category === 'DAILY'), [challenges]);
  const weeklyChallenges = useMemo(() => challenges.filter(c => c.category === 'WEEKLY'), [challenges]);
  const milestoneChallenges = useMemo(() => challenges.filter(c => c.category === 'MILESTONE'), [challenges]);

  const filteredBadges = useMemo(() => badges.filter(b => {
    if (badgeFilter === 'unlocked') return b.isUnlocked;
    if (badgeFilter === 'locked') return !b.isUnlocked;
    return true;
  }), [badges, badgeFilter]);

  if (loading) return <GamingLoader message="Loading your accomplishments..." />;

  return (
    <div className="min-h-full pb-10 animate-fade-in">
      {/* ── Header ── */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">PROGRESSION</h1>
          <p className="text-xs font-black text-[#fbbf24] uppercase tracking-[0.3em]">Vault Master Challenges & Badges</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => handleTabChange('challenges')}
            className={`px-6 py-3 rounded-2xl border flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 ${
              activeTab === 'challenges' 
                ? 'bg-[#fbbf24]/10 border-[#fbbf24]/30 shadow-[0_10px_30px_rgba(251,191,36,0.15)] cursor-default' 
                : 'bg-white/5 border-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="text-right">
              <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Challenges</p>
              <p className="text-xl font-black text-white leading-none">{completedChallenges}<span className="text-[#64748b] text-sm"> / {challenges.length}</span></p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'challenges' ? 'bg-[#fbbf24]/20' : 'bg-white/10'}`}>
              <Target className={`w-5 h-5 ${activeTab === 'challenges' ? 'text-[#fbbf24]' : 'text-white/40'}`} />
            </div>
          </button>
          
          <button 
            onClick={() => handleTabChange('badges')}
            className={`px-6 py-3 rounded-2xl border flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 ${
              activeTab === 'badges' 
                ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[0_10px_30px_rgba(59,130,246,0.15)] cursor-default' 
                : 'bg-white/5 border-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="text-right">
              <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Badges</p>
              <p className="text-xl font-black text-white leading-none">{unlockedBadges}<span className="text-[#64748b] text-sm"> / {badges.length}</span></p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'badges' ? 'bg-[#3b82f6]/20' : 'bg-white/10'}`}>
              <Award className={`w-5 h-5 ${activeTab === 'badges' ? 'text-[#3b82f6]' : 'text-white/40'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl w-fit border border-white/5">
        <button
          onClick={() => handleTabChange('challenges')}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'challenges' ? 'bg-[#fbbf24] text-[#0c0c1d] shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className={`w-4 h-4 ${activeTab === 'challenges' ? 'fill-current' : ''}`} />
          Challenges
        </button>
        <button
          onClick={() => handleTabChange('badges')}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'badges' ? 'bg-[#3b82f6] text-[#0c0c1d] shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className={`w-4 h-4 ${activeTab === 'badges' ? 'fill-current' : ''}`} />
          Badges
        </button>
      </div>

      {/* ── Content ── */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'challenges' && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Daily Section */}
                <div className="col-span-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-[#fbbf24]" />
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Daily Objectives</h3>
                  </div>
                </div>
                {dailyChallenges.map((challenge, i) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} index={i} />
                ))}

                {/* Weekly Section */}
                <div className="col-span-full mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Weekly Missions</h3>
                  </div>
                </div>
                {weeklyChallenges.map((challenge, i) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} index={i} color="#8b5cf6" />
                ))}

                {/* Milestone Section */}
                <div className="col-span-full mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Star className="w-5 h-5 text-[#ec4899]" />
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Lifetime Milestones</h3>
                  </div>
                </div>
                {milestoneChallenges.map((challenge, i) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} index={i} color="#ec4899" />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Badges Filter Toggles */}
              <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
                <button
                  onClick={() => setBadgeFilter('all')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    badgeFilter === 'all' ? 'bg-[#3b82f6] text-[#0c0c1d]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setBadgeFilter('unlocked')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    badgeFilter === 'unlocked' ? 'bg-[#3b82f6] text-[#0c0c1d]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  UNLOCKED
                </button>
                <button
                  onClick={() => setBadgeFilter('locked')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    badgeFilter === 'locked' ? 'bg-[#3b82f6] text-[#0c0c1d]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  LOCKED
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredBadges.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ChallengeCard = React.memo(function ChallengeCard({ challenge, index, color = '#fbbf24' }: { challenge: any, index: number, color?: string }) {
  const percentage = Math.min(Math.round((challenge.currentProgress / challenge.targetValue) * 100), 100);
  const isCompleted = challenge.status === 'COMPLETED';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative group p-5 rounded-3xl border transition-all duration-500 overflow-hidden ${
        isCompleted 
          ? `bg-[${color}]/5 border-[${color}]/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)]` 
          : 'bg-[#0c0c1d]/60 border-white/5 hover:border-white/10 hover:bg-[#0c0c1d]'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl bg-white/5 text-[${color}]`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
        </div>
        {isCompleted && (
          <div className="px-2 py-1 rounded bg-[#34d399]/10 text-[#34d399] text-[8px] font-black uppercase tracking-[0.2em]">
            Complete
          </div>
        )}
      </div>

      <h4 className="text-white font-black text-sm mb-1 tracking-tight truncate">{challenge.title}</h4>
      <p className="text-[#64748b] text-[11px] font-medium leading-relaxed mb-4 line-clamp-2 h-8">{challenge.description}</p>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Progress</p>
          <p className="text-[10px] font-black text-white uppercase tracking-widest">{percentage}%</p>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full transition-all`}
            style={{ backgroundColor: color }}
          />
        </div>
        <p className="text-[9px] font-bold text-[#475569] text-right">
          {challenge.currentProgress} / {challenge.targetValue} {challenge.type === 'PLAYTIME' ? 'seconds' : ''}
        </p>
      </div>
    </motion.div>
  );
});

const BadgeCard = React.memo(function BadgeCard({ badge, index }: { badge: any, index: number }) {
  const isUnlocked = badge.isUnlocked;
  
  const rarityColors: Record<string, string> = {
    COMMON: '#94a3b8',
    RARE: '#3b82f6',
    EPIC: '#8b5cf6',
    LEGENDARY: '#fbbf24'
  };

  const color = rarityColors[badge.rarity] || '#94a3b8';

  const handlePop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUnlocked) return;
    
    (window as any).gameVault?.triggerTrophy?.({
      title: badge.name,
      description: badge.description,
      type: badge.rarity === 'LEGENDARY' ? 'platinum' : 'gold',
      source: 'manual',
      iconUrl: '' 
    });
  };

  const IconMap: Record<string, any> = {
    'sparkles': Sparkles,
    'library': Library,
    'trophy': Trophy,
    'message-square': MessageSquare,
    'clock': Clock,
    'moon': Moon,
    'star': Star,
    'shield': Shield,
    'users': Users,
    'zap': Zap,
    'edit-3': Edit3,
    'rotate-ccw': RotateCcw,
    'bug': Bug,
    'award': Award,
    'map': Map,
    'flame': Flame,
    'calendar': Clock, 
    'swords': Swords,
    'cloud': Cloud,
    'crown': Crown
  };

  const BadgeIcon = IconMap[badge.icon] || Award;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03, layout: { duration: 0.3 } }}
      className="flex flex-col items-center group relative"
    >
      <div className="relative mb-3">
        {/* Hexagon/Badge shape background */}
        <div 
          className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 border-2 ${
            isUnlocked 
              ? `bg-[#0c0c1d] shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:scale-105` 
              : 'bg-[#030308] border-white/5 opacity-40 grayscale'
          }`}
          style={{ 
            borderColor: isUnlocked ? color : 'transparent',
            boxShadow: isUnlocked ? `0 0 20px ${color}10` : 'none'
          }}
        >
          <BadgeIcon className={`w-10 h-10 ${isUnlocked ? '' : 'text-white/10'}`} style={{ color: isUnlocked ? color : undefined }} />
          
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white/20" />
            </div>
          )}
          
          {isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-2xl">
              <button 
                onClick={handlePop}
                className="px-3 py-1 bg-[#fbbf24] text-[#0c0c1d] text-[10px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_10px_rgba(251,191,36,0.3)] hover:scale-105 transition-transform"
              >
                POP
              </button>
            </div>
          )}
          
          {isUnlocked && (
            <div className="absolute -top-1 -right-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-4 h-4 rounded-full bg-[#fbbf24] flex items-center justify-center border-2 border-[#0c0c1d]"
              >
                <Sparkles className="w-2 h-2 text-[#0c0c1d]" />
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center px-1">
        <h5 className={`text-[11px] font-black tracking-tight mb-0.5 truncate w-full ${isUnlocked ? 'text-white' : 'text-white/30'}`}>
          {badge.name}
        </h5>
        <div 
          className="text-[8px] font-black uppercase tracking-widest opacity-60"
          style={{ color: isUnlocked ? color : '#475569' }}
        >
          {badge.rarity}
        </div>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute invisible group-hover:visible bottom-full mb-2 w-48 p-3 rounded-xl bg-[#1e1e2e] border border-white/10 shadow-2xl z-10 pointer-events-none">
        <p className="text-xs font-black text-white mb-1">{badge.name}</p>
        <p className="text-[10px] text-[#94a3b8] font-medium leading-relaxed">{badge.description}</p>
        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Status</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isUnlocked ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
            {isUnlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
