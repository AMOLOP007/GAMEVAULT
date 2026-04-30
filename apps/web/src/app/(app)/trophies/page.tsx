'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, Search, Sparkles, Filter, Clock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { GamingLoader } from '@/components/ui/GamingLoader';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function TrophiesPage() {
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [search, setSearch] = useState('');
  const [steamId, setSteamId] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const stats = await api.get<any[]>('/api/achievements/stats');
        setGameStats(stats);
        
        // Fetch user profile to get saved steamId
        const profile = await api.get<any>('/api/auth/me');
        setSteamId(profile.steamId);
      } catch (err) {
        console.error('Failed to fetch trophy stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGameStats();
  }, []);

  const handleSelectGame = async (gameId: string) => {
    setSelectedGameId(gameId);
    setLoadingAchievements(true);
    try {
      const data = await api.get<any[]>(`/api/achievements/${gameId}`);
      setAchievements(data);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    } finally {
      setLoadingAchievements(false);
    }
  };

  // if (loading) return <GamingLoader message="Unlocking your trophy room..." />;

  const filteredGames = gameStats.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in">
      {/* ── Games List ── */}
      <div className="w-80 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">TROPHIES</h1>
          <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-[0.2em] mb-4">Game Milestone Tracker</p>
          
          <button
            onClick={() => setShowSyncModal(true)}
            className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
              steamId 
                ? 'bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/20' 
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {steamId ? 'Sync Steam Collection' : 'Link Steam Profile'}
          </button>
        </div>

        <div className="relative">
          <AnimatedInput
            icon={<Search className="w-4 h-4" />}
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-2">
          {loading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-full h-20 glass-panel animate-pulse opacity-50" />
              ))}
            </>
          ) : filteredGames.map((game) => (
            <button
              key={game.gameId}
              onClick={() => handleSelectGame(game.gameId)}
              className={`w-full p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 group ${
                selectedGameId === game.gameId 
                  ? 'bg-[#fbbf24]/10 border-[#fbbf24]/30 shadow-[0_0_20px_rgba(251,191,36,0.05)]' 
                  : 'bg-[#0c0c1d]/60 border-white/5 hover:border-white/10 hover:bg-[#0c0c1d]/80'
              }`}
            >
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#030308] shrink-0 border border-white/5">
                {game.coverUrl ? (
                  <img src={game.coverUrl} className="w-full h-full object-cover" alt={game.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white/10" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className={`text-sm font-black truncate mb-1 ${selectedGameId === game.gameId ? 'text-[#fbbf24]' : 'text-white'}`}>
                  {game.title}
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b]">
                  <span>{game.earned} / {game.total}</span>
                  <span className={game.percentage === 100 ? 'text-[#34d399]' : ''}>{game.percentage}%</span>
                </div>
                <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${game.percentage === 100 ? 'bg-[#34d399]' : 'bg-[#fbbf24]'}`}
                    style={{ width: `${game.percentage}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Achievements Grid ── */}
      <div className="flex-1 flex flex-col glass-panel border-[#fbbf24]/10 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!selectedGameId ? (
            <motion.div
              key="select-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-10"
            >
              <div className="w-20 h-20 rounded-3xl bg-[#fbbf24]/5 border border-[#fbbf24]/10 flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 text-[#fbbf24]/20" />
              </div>
              <h2 className="text-xl font-black text-white mb-2 tracking-tight">Select a Game</h2>
              <p className="text-[#64748b] text-sm max-w-xs font-medium">Select a title from the left to view your earned and remaining trophies.</p>
            </motion.div>
          ) : loadingAchievements ? (
            <motion.div key="loading-ach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center">
              <GamingLoader message="Retrieving achievements..." />
            </motion.div>
          ) : (
            <motion.div
              key="ach-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col p-8"
            >
              {/* Header Info */}
              <div className="flex items-end justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="p-3 rounded-2xl bg-[#fbbf24] shadow-[0_0_25px_rgba(251,191,36,0.3)]">
                      <Trophy className="w-6 h-6 text-[#0c0c1d] fill-current" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                       {gameStats.find(g => g.gameId === selectedGameId)?.title}
                     </h2>
                     <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.2em]">Achievement Collection</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                     <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Progress</p>
                     <p className="text-2xl font-black text-white leading-none">
                       {gameStats.find(g => g.gameId === selectedGameId)?.percentage}%
                     </p>
                   </div>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
                <div className="grid grid-cols-1 gap-3 pb-4">
                  {achievements.map((ach, i) => (
                    <motion.div
                      key={ach.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`p-4 rounded-2xl border flex items-center gap-5 group transition-all duration-500 ${
                        ach.isEarned 
                          ? 'bg-[#fbbf24]/05 border-[#fbbf24]/20 shadow-[0_10px_30px_rgba(251,191,36,0.03)]' 
                          : 'bg-[#030308]/40 border-white/5 opacity-60'
                      }`}
                    >
                      <div className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border ${
                        ach.isEarned ? 'border-[#fbbf24]/40' : 'border-white/5 grayscale opacity-50'
                      }`}>
                        {ach.iconUrl ? (
                          <img src={ach.iconUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white/10" />
                          </div>
                        )}
                        {ach.isEarned && (
                          <div className="absolute inset-0 bg-[#fbbf24]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-5 h-5 text-[#fbbf24]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base font-black tracking-tight mb-0.5 ${ach.isEarned ? 'text-white' : 'text-white/60'}`}>
                          {ach.name}
                        </h4>
                        <p className="text-xs text-[#64748b] font-medium leading-relaxed truncate group-hover:whitespace-normal transition-all">
                          {ach.description || 'Secret achievement.'}
                        </p>
                      </div>

                      <div className="text-right">
                        {ach.isEarned ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#34d399]/10 text-[#34d399] text-[9px] font-black uppercase tracking-widest mb-1">
                              Unlocked
                            </div>
                            {ach.earnedAt && (
                              <p className="text-[10px] font-bold text-[#475569]">{new Date(ach.earnedAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-white/30 text-[9px] font-black uppercase tracking-widest">
                            Locked
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSyncModal && (
          <SteamSyncModal 
            onClose={() => setShowSyncModal(false)} 
            onSynced={() => {
              // Refresh data
              window.location.reload();
            }} 
            games={gameStats}
            initialSteamId={steamId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SteamSyncModal({ onClose, onSynced, games, initialSteamId }: { 
  onClose: () => void; 
  onSynced: () => void; 
  games: any[];
  initialSteamId: string | null;
}) {
  const [steamId, setSteamId] = useState(initialSteamId || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSync = async () => {
    const cleanedId = steamId.trim();
    if (!cleanedId) return alert('Please enter your Steam ID or Profile URL');
    
    setLoading(true);
    setStatus('Initializing sync engine...');

    try {
      // 1. Save cleaned ID to profile
      setStatus('Linking Steam profile...');
      await api.post('/api/sync/steam-id', { steamId: cleanedId });

      // 2. Sync games
      let syncedCount = 0;
      let failedCount = 0;
      const steamGames = games.filter(g => g.steamAppId);
      
      if (steamGames.length === 0) {
        alert('No Steam games found in library. Make sure Steam App IDs are set in game settings.');
        setLoading(false);
        return;
      }

      for (const g of steamGames) {
        if (!g.gameId || !g.steamAppId) continue;
        
        setStatus(`Syncing ${g.title}...`);
        try {
          const response = await api.post<any>('/api/sync/steam-public', {
            steamId: cleanedId,
            gameId: g.gameId,
            steamAppId: g.steamAppId.toString()
          });
          if (response.success) syncedCount++;
          else failedCount++;
        } catch (e) {
          console.error(`Failed to sync ${g.title}:`, e);
          failedCount++;
        }
      }

      if (syncedCount > 0) {
        alert(`Sync complete! ${syncedCount} games updated.${failedCount > 0 ? ` (${failedCount} failed - check privacy settings)` : ''}`);
        onSynced();
        onClose();
      } else {
        alert('Sync failed for all games. Verify your Steam "Game Details" are set to Public.');
      }
    } catch (err: any) {
      console.error('Steam Sync Error:', err);
      alert(`Sync failed: ${err.error || err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030308]/95 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0c0c1d] border border-[#fbbf24]/20 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#fbbf24]/10 text-[#fbbf24]">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Steam Vault Sync</h2>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Global Collection Sync</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {!initialSteamId && (
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              Link your Steam profile to GameVault. Once linked, you can sync your entire collection with a single click.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black text-[#fbbf24]/60 uppercase tracking-[0.15em] block ml-1">Steam Profile ID / Name</label>
            <input
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="e.g. 76561198000000000 or custom_name"
              disabled={loading}
              className="w-full h-12 bg-[#030308] border border-white/5 rounded-xl px-4 text-white font-bold placeholder:text-white/10 focus:border-[#fbbf24]/50 focus:outline-none transition-all"
            />
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
             <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-[#fbbf24] animate-pulse' : 'bg-[#64748b]'}`} />
                <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Engine Status</p>
             </div>
             <p className="text-xs text-white font-bold">{loading ? status : 'Ready to engage sync engine'}</p>
          </div>

          <div className="flex gap-3">
            <AnimatedButton onClick={handleSync} loading={loading} className="flex-1 bg-[#fbbf24] text-[#0c0c1d] hover:bg-[#f59e0b] h-12">
              {initialSteamId ? 'Start Sync' : 'Link & Sync'}
            </AnimatedButton>
          </div>
          
          <p className="text-[10px] text-[#475569] text-center font-bold">
            Note: Your profile must be set to <b>Public</b> for the sync to work.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
