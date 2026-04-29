'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Gamepad2, 
  Trophy, 
  Clock, 
  Search, 
  UserPlus, 
  Check, 
  X,
  MessageSquare,
  Zap,
  Star,
  Activity as ActivityIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '../../../lib/api';
import GlobalChat from '@/components/social/GlobalChat';

interface Activity {
  id: string;
  type: string;
  userId: string;
  gameId: string | null;
  metadata: string | null;
  createdAt: string;
  user: {
    username: string;
    avatarUrl: string | null;
  };
}

interface Friend {
  id: string;
  username: string;
  avatarUrl: string | null;
  status?: string;
}

export default function SocialPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchSocialData();
    }
  }, [user]);

  const fetchSocialData = async () => {
    try {
      const token = localStorage.getItem('gv_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [actRes, friendRes, pendingRes] = await Promise.all([
        fetch(`${API_URL}/social/activity/friends/${user?.id}`, { headers }),
        fetch(`${API_URL}/social/friends/${user?.id}`, { headers }),
        fetch(`${API_URL}/social/friends/pending/${user?.id}`, { headers })
      ]);

      if (actRes.ok) setActivities(await actRes.json());
      if (friendRes.ok) setFriends(await friendRes.json());
      if (pendingRes.ok) setPendingRequests(await pendingRes.json());
    } catch (err) {
      console.error('Failed to fetch social data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityText = (activity: Activity) => {
    const meta = activity.metadata ? JSON.parse(activity.metadata) : {};
    switch (activity.type) {
      case 'STARTED_PLAYING':
        return 'is now playing';
      case 'EARNED_ACHIEVEMENT':
        return `unlocked "${meta.achievementTitle || 'an achievement'}" in`;
      case 'ADDED_GAME':
        return 'added a new game to library:';
      default:
        return 'is active in';
    }
  };

  return (
    <div className="min-h-screen p-8 pt-6">
      {/* ── Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-white tracking-tight flex items-center gap-4"
          >
            <div className="p-2.5 rounded-2xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <Users className="w-8 h-8 text-[#a78bfa]" />
            </div>
            Social Hub
          </motion.h1>
          <p className="text-[#94a3b8] font-bold mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse shadow-[0_0_10px_#34d399]" />
            See what your friends are conquering today
          </p>
        </div>

        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b5cf6]/50 group-focus-within:text-[#8b5cf6] transition-colors" />
          <input 
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c0c1d]/60 border border-[#8b5cf6]/10 rounded-2xl py-3.5 pl-11 pr-6 text-sm font-bold text-white placeholder:text-[#475569] focus:outline-none focus:border-[#8b5cf6]/40 focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all backdrop-blur-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Global Chat ── */}
        <div className="lg:col-span-8 flex flex-col h-[700px]">
          <GlobalChat />
        </div>

        {/* ── Sidebar: Friends & Requests ── */}
        <div className="lg:col-span-4 space-y-8">
          {/* Friend Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-[#8b5cf6] uppercase tracking-[0.25em] flex items-center gap-2">
                Incoming Requests
                <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px]">{pendingRequests.length}</span>
              </h3>
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-2xl bg-[#1e1b4b]/30 border border-[#8b5cf6]/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center text-xs font-black text-white">
                        {req.user.username[0]}
                      </div>
                      <span className="text-sm font-black text-white">{req.user.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg bg-[#34d399]/20 hover:bg-[#34d399]/30 text-[#34d399] transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-[#8b5cf6] uppercase tracking-[0.25em] flex items-center gap-2">
              Friends List
              <span className="text-[#475569]">({friends.length})</span>
            </h3>
            
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="p-8 rounded-3xl border border-[#8b5cf6]/10 text-center bg-[#0c0c1d]/40">
                  <p className="text-xs font-bold text-[#64748b]">No friends added yet.</p>
                </div>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="group p-3.5 rounded-2xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/05 hover:border-[#8b5cf6]/20 transition-all flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-xl bg-[#1e1b4b] border border-[#8b5cf6]/20 flex items-center justify-center font-black text-white">
                          {friend.username[0]}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#34d399] border-[3px] border-[#0c0c1d]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white group-hover:text-[#a78bfa] transition-colors">{friend.username}</p>
                        <p className="text-[10px] font-bold text-[#475569] uppercase">Online</p>
                      </div>
                    </div>
                    <button className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-[#8b5cf6]/10 text-[#64748b] hover:text-[#c084fc] transition-all">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all active:scale-[0.98]">
              <UserPlus className="w-4 h-4" />
              Find New Players
            </button>
          </div>

          {/* Quick Stats Widget */}
          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#8b5cf6]/10 to-transparent border border-[#8b5cf6]/10">
            <p className="text-[10px] font-black text-[#a78bfa] uppercase tracking-[0.2em] mb-4">Social Stats</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/10">
                <p className="text-2xl font-black text-white">{friends.length}</p>
                <p className="text-[9px] font-bold text-[#64748b] uppercase">Friends</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/10">
                <p className="text-2xl font-black text-white">{activities.length}</p>
                <p className="text-[9px] font-bold text-[#64748b] uppercase">Events</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
