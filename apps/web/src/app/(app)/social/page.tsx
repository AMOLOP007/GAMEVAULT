'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Trophy, 
  Gamepad2, 
  Activity, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
  Zap,
  Swords
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatPlaytime, formatDate } from '@/lib/utils';

export default function SocialPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendProfile, setFriendProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');

  useEffect(() => {
    if (user?.id) {
      loadSocialData();
    }
  }, [user]);

  const loadSocialData = async () => {
    try {
      const [f, p] = await Promise.all([
        api.get(`/api/social/friends/${user?.id}`),
        api.get(`/api/social/friends/pending/${user?.id}`)
      ]);
      setFriends(f);
      setPending(p);
    } catch (err) {
      console.error('Failed to load social data', err);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/api/social/users/search?query=${searchQuery}&currentUserId=${user?.id}`);
      setSearchResults(res);
      setActiveTab('search');
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (friendId: string) => {
    try {
      await api.post('/api/social/friends/request', { userId: user?.id, friendId });
      handleSearch(); // Refresh search results to show "SENT"
    } catch (err) {
      console.error('Request failed', err);
    }
  };

  const acceptRequest = async (friendId: string) => {
    try {
      await api.post('/api/social/friends/accept', { userId: user?.id, friendId });
      loadSocialData();
    } catch (err) {
      console.error('Accept failed', err);
    }
  };

  const rejectRequest = async (targetId: string) => {
    try {
      await api.post('/api/social/friends/reject', { userId: user?.id, targetId });
      loadSocialData();
      if (selectedFriend?.id === targetId) setSelectedFriend(null);
    } catch (err) {
      console.error('Reject failed', err);
    }
  };

  const viewProfile = async (friend: any) => {
    setSelectedFriend(friend);
    setLoadingProfile(true);
    try {
      const res = await api.get(`/api/social/friends/profile/${friend.id}?userId=${user?.id}`);
      setFriendProfile(res);
    } catch (err) {
      console.error('Failed to load profile', err);
      setSelectedFriend(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* ── Social Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            <Users className="w-10 h-10 text-[#8b5cf6]" /> Social Vault
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Connect • Compare • Conquer</p>
        </div>

        <div className="relative group w-full md:w-96">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 pl-12 text-sm text-white focus:outline-none focus:border-[#8b5cf6]/50 transition-all placeholder:text-slate-600"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-[#8b5cf6] transition-colors" />
          {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b5cf6] animate-spin" />}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* ── Sidebar: Lists ── */}
        <div className="xl:col-span-4 space-y-6">
          <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
            {(['friends', 'requests', 'search'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t ? 'bg-[#8b5cf6] text-white shadow-lg' : 'text-slate-500 hover:text-white'
                }`}
              >
                {t} {t === 'requests' && pending.length > 0 && `(${pending.length})`}
              </button>
            ))}
          </div>

          <div className="glass-panel min-h-[500px] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  {activeTab === 'friends' ? 'My Allies' : activeTab === 'requests' ? 'Pending Access' : 'Discovery Results'}
               </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
               <AnimatePresence mode="popLayout">
                  {activeTab === 'friends' && friends.map((f) => (
                    <motion.button
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={f.id}
                      onClick={() => viewProfile(f)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                        selectedFriend?.id === f.id ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30' : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-[9px] bg-[#0c0c1d] flex items-center justify-center font-black text-white uppercase italic">
                           {f.username[0]}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white group-hover:text-[#c084fc] transition-colors">{f.username}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Level 24 Commander</p>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-[#8b5cf6] transition-all ${selectedFriend?.id === f.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                    </motion.button>
                  ))}

                  {activeTab === 'requests' && pending.map((req) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={req.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/10"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white">
                        {req.user.username[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{req.user.username}</p>
                        <p className="text-[9px] font-bold text-[#8b5cf6] uppercase tracking-widest">Wants to ally</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(req.user.id)} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"><Check className="w-4 h-4" /></button>
                        <button onClick={() => rejectRequest(req.user.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </motion.div>
                  ))}

                  {activeTab === 'search' && searchResults.map((u) => (
                    <motion.div
                      layout
                      key={u.id}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white">
                        {u.username[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{u.username}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Found in global cache</p>
                      </div>
                      {u.relationship === 'NONE' && (
                        <button 
                          onClick={() => sendRequest(u.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#7c3aed] transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="w-3 h-3" /> Add
                        </button>
                      )}
                      {u.relationship === 'SENT' && (
                        <span className="text-[9px] font-black uppercase text-[#8b5cf6] tracking-widest border border-[#8b5cf6]/20 px-2 py-1 rounded-md bg-[#8b5cf6]/10">Sent</span>
                      )}
                      {u.relationship === 'FRIEND' && (
                        <span className="text-[9px] font-black uppercase text-green-400 tracking-widest">Ally</span>
                      )}
                    </motion.div>
                  ))}

                  {((activeTab === 'friends' && friends.length === 0) || 
                    (activeTab === 'requests' && pending.length === 0) || 
                    (activeTab === 'search' && searchResults.length === 0)) && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center px-6">
                       <Zap className="w-12 h-12 mb-4" />
                       <p className="text-xs font-black uppercase tracking-[0.2em]">No Data in this Channel</p>
                    </div>
                  )}
               </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Main Content: Friend Profile ── */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedFriend ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 border-dashed border-white/10 bg-transparent"
              >
                <div className="w-24 h-24 rounded-full bg-[#8b5cf6]/5 flex items-center justify-center mb-8">
                  <Users className="w-10 h-10 text-[#8b5cf6]/20" />
                </div>
                <h2 className="text-2xl font-black text-slate-700 uppercase italic tracking-tighter">Select an Ally</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4 max-w-xs">View their trophies, playtime stats, and legendary accomplishments.</p>
              </motion.div>
            ) : loadingProfile ? (
              <motion.div key="loading" className="glass-panel h-full min-h-[600px] flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-[#8b5cf6] animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Profile Banner */}
                <div className="glass-panel overflow-hidden">
                  <div className="h-32 bg-gradient-to-r from-[#8b5cf6]/20 via-[#d946ef]/10 to-transparent relative">
                     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                  </div>
                  <div className="px-8 pb-8 -mt-12 relative z-10 flex flex-col md:flex-row items-end gap-6">
                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] p-1 shadow-2xl">
                      <div className="w-full h-full rounded-[1.8rem] bg-[#0c0c1d] flex items-center justify-center text-5xl font-black text-white italic">
                         {friendProfile.profile.username[0]}
                      </div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-3">
                         <h2 className="text-4xl font-black text-white tracking-tighter italic">{friendProfile.profile.username}</h2>
                         <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black uppercase tracking-[0.2em]">Online</div>
                      </div>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Allied since {new Date(friendProfile.profile.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-4 pb-4">
                       <button onClick={() => rejectRequest(selectedFriend.id)} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Remove Ally</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-white/5 divide-x divide-white/5">
                    {[
                      { l: 'Games', v: friendProfile.profile._count.games, i: Gamepad2, c: '#8b5cf6' },
                      { l: 'Trophies', v: friendProfile.profile._count.achievements, i: Trophy, c: '#fbbf24' },
                      { l: 'Badges', v: friendProfile.profile._count.badges, i: Zap, c: '#34d399' }
                    ].map((s, i) => (
                      <div key={i} className="p-6 text-center group">
                         <s.i className="w-5 h-5 mx-auto mb-3 transition-transform group-hover:scale-125" style={{ color: s.c }} />
                         <p className="text-2xl font-black text-white leading-none">{s.v}</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* In-App Trophies */}
                   <div className="glass-panel p-8">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400"><Trophy className="w-5 h-5" /></div>
                         <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Elite Trophies</h3>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">In-App Accomplishments Only</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                         {friendProfile.trophies.map((t: any) => (
                           <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
                                 <Trophy className="w-5 h-5 text-[#8b5cf6]" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[13px] font-black text-white truncate">{t.achievement.title}</p>
                                 <p className="text-[10px] font-bold text-slate-500 truncate">{t.achievement.description}</p>
                              </div>
                           </div>
                         ))}
                         {friendProfile.trophies.length === 0 && (
                            <div className="text-center py-12 opacity-30 italic text-xs">No elite trophies earned yet</div>
                         )}
                      </div>
                   </div>

                   {/* Most Played */}
                   <div className="glass-panel p-8">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400"><Activity className="w-5 h-5" /></div>
                         <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Top Records</h3>
                      </div>

                      <div className="space-y-4">
                         {friendProfile.games.map((ug: any) => (
                           <div key={ug.id} className="flex items-center gap-5 p-3 rounded-xl hover:bg-white/[0.03] transition-all group">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                 <SafeImage src={ug.game.coverUrl} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-black text-white truncate group-hover:text-[#c084fc] transition-colors">{ug.game.title}</p>
                                 <div className="flex items-center gap-4 mt-1">
                                    <p className="text-[10px] font-black text-white italic">{Math.floor(ug.totalPlaytime / 3600)}h <span className="text-slate-500 not-italic">PLAYED</span></p>
                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    <p className="text-[10px] font-black text-[#8b5cf6] uppercase">{ug.status}</p>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Unique Feature: Global Challenge Comparison */}
                <div className="glass-panel p-8 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-[#8b5cf6]/5 blur-[100px] rounded-full group-hover:bg-[#8b5cf6]/10 transition-all" />
                   <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="p-3 rounded-2xl bg-[#d946ef]/10 text-[#d946ef]"><Swords className="w-5 h-5" /></div>
                         <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Rivalry Stats</h3>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Head-to-head Comparison</p>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                               <span className="text-slate-500">Trophy Lead</span>
                               <span className="text-white">{user?.username} vs {friendProfile.profile.username}</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                               <div className="h-full bg-[#8b5cf6]" style={{ width: '65%' }} />
                               <div className="h-full bg-[#d946ef]" style={{ width: '35%' }} />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                               <span className="text-slate-500">Playtime Dominance</span>
                               <span className="text-white">74% Advantage</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                               <motion.div initial={{ width: 0 }} animate={{ width: '74%' }} className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#d946ef]" />
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center justify-center">
                         <div className="text-center p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-md">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Vault Verdict</p>
                            <p className="text-4xl font-black text-white italic tracking-tighter">YOU LEAD</p>
                            <div className="mt-4 px-4 py-2 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#c084fc] text-[9px] font-black uppercase tracking-widest">
                               +1,200 XP Delta
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
