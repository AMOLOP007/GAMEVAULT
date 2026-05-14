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
  const [epicId, setEpicId] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingOfflineAchs, setPendingOfflineAchs] = useState<any[]>([]);
  const [poppingTrophy, setPoppingTrophy] = useState(false);
  const [currentPoppingTrophy, setCurrentPoppingTrophy] = useState<any>(null);
  const [trophyFilter, setTrophyFilter] = useState<'all' | 'steam' | 'inapp'>('all');
  const [trophySearch, setTrophySearch] = useState('');
  const [showTrophySearch, setShowTrophySearch] = useState(false);

  useEffect(() => {
    const fetchGameStats = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gv_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const stats = await api.get<any[]>('/api/achievements/stats');
        setGameStats(stats);
        
        // Fetch user profile to get saved IDs
        const profile = await api.get<any>('/api/auth/me');
        setSteamId(profile.steamId);
        setEpicId(profile.epicId);
      } catch (err) {
        console.error('Failed to fetch trophy stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGameStats();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gameVault) {
      (window as any).gameVault.onOfflineAchievementsDetected((data: any[]) => {
        setPendingOfflineAchs(data);
      });
    }
  }, []);

  const handleSelectGame = async (gameId: string) => {
    setSelectedGameId(gameId);
    setLoadingAchievements(true);
    try {
      const selectedGame = gameStats.find(g => g.gameId === gameId);

      // Try local Electron bridge first (uses robust XML fallback)
      if (typeof window !== 'undefined' && (window as any).gameVault?.getAchievements) {
        const localAchs = await (window as any).gameVault.getAchievements(gameId, {
          title: selectedGame?.title,
          steamAppId: selectedGame?.steamAppId
        });
        if (localAchs && localAchs.length > 0) {
          setAchievements(localAchs.map((a: any) => ({
            ...a,
            isOfficial: a.source === 'steam' || a.source === 'epic',
            title: a.name || a.title
          })));
          setLoadingAchievements(false);
          return;
        }
      }

      const data = await api.get<any>(`/api/achievements/${gameId}`);
      // Unify the list for display
      const unified = [
        ...data.official.map((a: any) => ({ ...a, isOfficial: true })),
        ...data.internal.map((a: any) => ({ ...a, isOfficial: false }))
      ];
      setAchievements(unified);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const handlePopNextOffline = async () => {
    if (pendingOfflineAchs.length === 0) return;
    const current = pendingOfflineAchs[0];
    setPoppingTrophy(true);
    
    (window as any).gameVault?.triggerTrophy({
      title: current.name,
      description: current.description,
      gameTitle: current.gameTitle,
      type: 'gold',
      source: current.source,
      iconUrl: current.iconUrl,
      globalPercent: current.globalPercent,
      earnedAt: current.earnedAt,
    });
    
    (window as any).gameVault?.confirmOfflineAchievements([current]);
    await new Promise(resolve => setTimeout(resolve, 4000));
    setPoppingTrophy(false);
    setPendingOfflineAchs(prev => prev.slice(1));
  };

  const handlePopIndividual = async (ach: any) => {
    setCurrentPoppingTrophy(ach);
    setPoppingTrophy(true);
    (window as any).gameVault?.triggerTrophy({
      title: ach.name || ach.title,
      description: ach.description,
      gameTitle: gameStats.find(g => g.gameId === selectedGameId)?.title || 'Game',
      type: 'gold',
      source: ach.source,
      iconUrl: ach.iconUrl,
      globalPercent: ach.globalPercent,
      earnedAt: ach.earnedAt,
    });
    await new Promise(resolve => setTimeout(resolve, 4000));
    setPoppingTrophy(false);
  };

  const handleMarkAsDone = async (ach: any) => {
    if (window.confirm(`Mark "${ach.name || ach.title}" as done and pop trophy?`)) {
      setCurrentPoppingTrophy(ach);
      setPoppingTrophy(true);
      
      (window as any).gameVault?.triggerTrophy({
        title: ach.name || ach.title,
        description: ach.description,
        gameTitle: gameStats.find(g => g.gameId === selectedGameId)?.title || 'Game',
        type: 'gold',
        source: ach.source || 'manual',
        iconUrl: ach.iconUrl,
        globalPercent: ach.globalPercent,
        earnedAt: new Date(),
      });
      
      setAchievements(prev => prev.map(a => 
        a.key === ach.key ? { ...a, isEarned: true, earnedAt: new Date() } : a
      ));

      setGameStats(prev => prev.map(g => 
        g.gameId === selectedGameId ? { ...g, earned: (g.earned || 0) + 1, percentage: Math.min(100, Math.round(((g.earned || 0) + 1) / g.total * 100)) } : g
      ));
      
      // Persist to local DB via Electron
      (window as any).gameVault?.markAchievementDone?.({
        gameId: selectedGameId,
        key: ach.key,
        name: ach.name || ach.title,
        description: ach.description,
        iconUrl: ach.iconUrl
      });
      
      await new Promise(resolve => setTimeout(resolve, 4000));
      setPoppingTrophy(false);
    }
  };

  const handleShowWelcomeAnimation = async () => {
    setCurrentPoppingTrophy(null);
    setPoppingTrophy(true);
    
    // Trigger welcome trophy
    (window as any).gameVault?.triggerTrophy({
      title: 'Welcome to GameVault!',
      description: 'You have taken your first step into the ultimate gaming vault.',
      type: 'new_user_welcome',
      source: 'first_launch'
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Trigger welcome badge
    (window as any).gameVault?.triggerTrophy({
      title: 'Badge Earned: Welcome to the Vault',
      description: 'Create your account and start your journey',
      type: 'gold',
      source: 'badge'
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    setPoppingTrophy(false);
  };

  const filteredGames = gameStats.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAchievements = achievements
    .filter(ach => {
      const matchesFilter = trophyFilter === 'all' || 
                           (trophyFilter === 'steam' && ach.isOfficial) || 
                           (trophyFilter === 'inapp' && !ach.isOfficial);
      const matchesSearch = (ach.name || ach.title || '').toLowerCase().includes(trophySearch.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (a.isEarned === b.isEarned) return 0;
      return a.isEarned ? -1 : 1;
    });

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in">
      {/* ── Games List ── */}
      <div className="w-80 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-1">TROPHIES</h1>
          <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-[0.2em] mb-4">Game Milestone Tracker</p>
          
          <button
            onClick={() => setShowSyncModal(true)}
            className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24] hover:bg-[#fbbf24]/20`}
          >
            <Trophy className="w-4 h-4" />
            Universal Vault Sync
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
          ) : (
            filteredGames.map((game) => (
              <motion.button
                key={game.gameId}
                whileHover={{ x: 4 }}
                onClick={() => handleSelectGame(game.gameId)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selectedGameId === game.gameId 
                    ? 'bg-gradient-to-r from-[#fbbf24]/20 to-transparent border-[#fbbf24]/30' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                }`}
              >
                <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xs font-black text-white truncate w-40">{game.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${game.percentage}%` }}
                        className="h-full bg-[#fbbf24]"
                      />
                    </div>
                    <span className="text-[10px] font-black text-[#64748b]">{game.percentage}%</span>
                  </div>
                  <p className="text-[9px] font-bold text-[#475569] mt-1">
                    {game.earned} / {game.total} Trophies
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all ${selectedGameId === game.gameId ? 'text-[#fbbf24] translate-x-1' : 'text-white/10'}`} />
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col glass-panel rounded-3xl border border-white/5 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!selectedGameId ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12"
            >
              <div className="w-24 h-24 rounded-full bg-[#fbbf24]/5 border border-[#fbbf24]/10 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-[#fbbf24] opacity-20" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Trophy Vault</h2>
              <p className="text-sm text-[#64748b] max-w-xs font-bold leading-relaxed mb-4">
                Select a game from the sidebar to view your earned achievements and upcoming challenges.
              </p>
              {gameStats.reduce((acc, g) => acc + (g.earned || 0), 0) === 0 && (
                <button
                  onClick={handleShowWelcomeAnimation}
                  className="px-4 py-2 bg-[#8b5cf6] text-white rounded-xl text-xs font-black uppercase hover:bg-[#8b5cf6]/80 transition-colors"
                >
                  Play Welcome Animation
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key={selectedGameId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Game Header */}
              {gameStats.find(g => g.gameId === selectedGameId) && (
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-24 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                      <img 
                        src={gameStats.find(g => g.gameId === selectedGameId)?.coverUrl} 
                        alt="cover" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                        {gameStats.find(g => g.gameId === selectedGameId)?.title}
                      </h2>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20">
                            <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" />
                            <span className="text-[10px] font-black text-[#fbbf24] uppercase tracking-wider">
                              {gameStats.find(g => g.gameId === selectedGameId)?.earned} / {gameStats.find(g => g.gameId === selectedGameId)?.total} Earned
                            </span>
                         </div>
                         <div className="flex items-center gap-2 text-[#64748b]">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Global Rank: #420</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="text-4xl font-black text-white italic tracking-tighter">
                      {gameStats.find(g => g.gameId === selectedGameId)?.percentage}<span className="text-sm text-[#fbbf24] ml-1">%</span>
                    </div>
                    <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mt-1">Completion Status</p>
                  </div>
                </div>
              )}

              {/* Achievements Grid */}
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                {/* Unique Toggle & Search */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
                    {(['all', 'steam', 'inapp'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setTrophyFilter(tab)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                          trophyFilter === tab 
                            ? 'bg-[#fbbf24] text-[#0c0c1d] shadow-lg' 
                            : 'text-[#64748b] hover:text-white'
                        }`}
                      >
                        {tab === 'all' ? 'All Trophies' : tab === 'steam' ? 'Steam' : 'In-App'}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTrophySearch(!showTrophySearch)}
                      className={`p-2 rounded-xl border transition-all ${
                        showTrophySearch 
                          ? 'bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24]' 
                          : 'bg-white/[0.02] border-white/5 text-[#64748b] hover:text-white'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    
                    <AnimatePresence>
                      {showTrophySearch && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 200, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <input
                            type="text"
                            placeholder="Search trophies..."
                            value={trophySearch}
                            onChange={(e) => setTrophySearch(e.target.value)}
                            className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 w-full focus:outline-none focus:border-[#fbbf24]/30 transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {pendingOfflineAchs.length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-between animate-fade-in">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase">Offline Trophies Detected</h4>
                      <p className="text-[10px] text-[#64748b] font-bold mt-0.5">{pendingOfflineAchs.length} trophies found in local files. Pop them to sync.</p>
                    </div>
                    <button
                      onClick={handlePopNextOffline}
                      className="px-3 py-1.5 bg-[#fbbf24] text-[#0c0c1d] rounded-lg text-[10px] font-black uppercase hover:bg-[#fbbf24]/80 transition-colors"
                    >
                      Pop Next
                    </button>
                  </div>
                )}
                {loadingAchievements ? (
                  <div className="flex items-center justify-center h-full">
                    <GamingLoader message="Decrypting achievement data..." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAchievements.map((ach, idx) => (
                      <motion.div
                        key={ach.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onContextMenu={(e) => {
                          if (!ach.isEarned) {
                            e.preventDefault();
                            handleMarkAsDone(ach);
                          }
                        }}
                        className={`group relative p-4 rounded-2xl border transition-all ${
                          ach.isEarned 
                            ? 'bg-gradient-to-br from-[#fbbf24]/10 to-transparent border-[#fbbf24]/20' 
                            : 'bg-white/[0.02] border-white/5 opacity-60 grayscale'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ${ach.isEarned ? 'border border-[#fbbf24]/30' : 'border border-white/10'}`}>
                            {ach.iconUrl ? (
                              <img src={ach.iconUrl} alt="icon" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5">
                                <Trophy className="w-5 h-5 text-white/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h4 className="text-[11px] font-black text-white leading-tight uppercase tracking-tight">{ach.name || ach.title}</h4>
                              {ach.source && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                                  ach.source === 'steam' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  ach.source === 'internal' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                  'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20'
                                }`}>
                                  {ach.source}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-[#64748b] mt-1 line-clamp-2 leading-relaxed italic">{ach.description}</p>
                          </div>
                        </div>
                        {ach.isEarned && (
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                             <Sparkles className="w-3 h-3 text-[#fbbf24] animate-pulse" />
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handlePopIndividual(ach);
                               }}
                               className="text-[8px] font-black uppercase text-[#fbbf24] bg-[#fbbf24]/10 px-1.5 py-0.5 rounded border border-[#fbbf24]/20 hover:bg-[#fbbf24]/20 transition-all opacity-0 group-hover:opacity-100"
                             >
                               Pop
                             </button>
                          </div>
                        )}
                        {ach.earnedAt && (
                           <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                              <span className="text-[#64748b]">Unlocked</span>
                              <span className="text-[#fbbf24]">{new Date(ach.earnedAt).toLocaleDateString()}</span>
                           </div>
                        )}
                      </motion.div>
                    ))}
                    {filteredAchievements.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <Trophy className="w-12 h-12 text-white/10 mb-4" />
                        <h3 className="text-sm font-black text-white uppercase mb-1">No Trophies Yet</h3>
                        <p className="text-xs text-[#64748b] font-bold uppercase tracking-widest mb-4">Earn trophies by playing games or syncing your library.</p>
                        <button
                          onClick={handleShowWelcomeAnimation}
                          className="px-4 py-2 bg-[#8b5cf6] text-white rounded-xl text-xs font-black uppercase hover:bg-[#8b5cf6]/80 transition-colors"
                        >
                          Play Welcome Animation
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Popping Trophy Dimmer Disabled ── */}

      <AnimatePresence>
        {showSyncModal && (
          <SyncModal 
            onClose={() => setShowSyncModal(false)} 
            initialSteamId={steamId}
            initialEpicId={epicId}
            onSynced={() => {
              // Refresh stats
              setLoading(true);
              api.get<any[]>('/api/achievements/stats').then(setGameStats).finally(() => setLoading(false));
            }}
            games={gameStats}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SyncModal({ onClose, initialSteamId, initialEpicId, onSynced, games }: { onClose: () => void, initialSteamId: string | null, initialEpicId: string | null, onSynced: () => void, games: any[] }) {
  const [activeTab, setActiveTab] = useState<'steam' | 'epic' | 'gog'>('steam');
  const [steamId, setSteamId] = useState(initialSteamId || '');
  const [epicId, setEpicId] = useState(initialEpicId || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSyncSteam = async () => {
    if (!steamId) return;
    setLoading(true);
    const cleanedId = steamId.trim();
    try {
      setStatus('Linking Steam profile...');
      await api.post('/api/sync/steam-id', { steamId: cleanedId });
      
      const steamGames = games.filter(g => g.steamAppId);
      if (steamGames.length === 0) {
        alert('No Steam games found in library.');
        setLoading(false);
        return;
      }

      let syncedCount = 0;
      for (const g of steamGames) {
        setStatus(`Syncing ${g.title}...`);
        try {
          const res = await api.post<any>('/api/sync/steam-public', {
            steamId: cleanedId,
            gameId: g.gameId,
            steamAppId: g.steamAppId.toString()
          });
          if (res.success) syncedCount++;
        } catch {}
      }
      alert(`Sync complete! ${syncedCount} games updated.`);
      onSynced();
      onClose();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EPIC_AUTH_SUCCESS') {
        setStatus('Epic Account Linked! Starting sync...');
        const { accessToken, accountId } = event.data;
        if (accountId) setEpicId(accountId);
        handleSyncEpic(accessToken);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSyncEpic = async (token?: string) => {
    if (!epicId) return;
    setLoading(true);
    const cleanedId = epicId.trim();
    try {
      setStatus('Linking Epic account...');
      await api.post('/api/sync/epic-id', { epicId: cleanedId });
      
      setStatus('Fetching Epic data...');
      const res = await api.post<any>('/api/sync/epic', { epicId: cleanedId, accessToken: token });
      
      alert(`Epic Sync Complete! ${res.definitionsHydrated} total trophies discovered, ${res.achievementsSynced} earned.`);
      onSynced();
      onClose();
    } catch (err: any) {
      alert(`Epic Sync failed: ${err.message}`);
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
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Universal Sync</h2>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Cross-Platform Bridge</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1.5 rounded-xl bg-white/[0.02] border border-white/5">
          {(['steam', 'epic', 'gog'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-[#fbbf24] text-[#0c0c1d] shadow-lg' 
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'steam' && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#fbbf24]/60 uppercase tracking-[0.15em] block ml-1">Steam Profile ID / Name</label>
                <input
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  placeholder="e.g. 76561198000000000 or custom_name"
                  className="w-full h-12 bg-[#030308] border border-white/5 rounded-xl px-4 text-white font-bold placeholder:text-white/10 focus:border-[#fbbf24]/50 focus:outline-none transition-all"
                />
              </div>
              <AnimatedButton onClick={handleSyncSteam} loading={loading} className="w-full bg-[#fbbf24] text-[#0c0c1d] h-12">
                Sync Steam
              </AnimatedButton>
            </>
          )}

          {activeTab === 'epic' && (
            <>
              <div className="space-y-4">
                {!epicId ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-sm text-[#94a3b8] mb-4">
                      Connect your Epic Games account to securely sync your earned trophies and playtime directly from Epic.
                    </p>
                    <AnimatedButton 
                      onClick={async () => {
                        const { url } = await api.get<any>('/api/auth/epic/login');
                        window.open(url, 'Epic Login', 'width=600,height=700');
                      }}
                      className="w-full bg-[#fbbf24] text-[#0c0c1d] h-11"
                    >
                      Connect Epic Account
                    </AnimatedButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                       <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Account Linked</span>
                       <span className="text-xs font-bold text-white">{epicId.substring(0, 8)}...</span>
                    </div>
                    <AnimatedButton onClick={() => handleSyncEpic()} loading={loading} className="w-full bg-[#fbbf24] text-[#0c0c1d] h-12">
                      Sync Epic Collection
                    </AnimatedButton>
                  </div>
                )}
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-[#0c0c1d] px-2 text-[#475569]">Or use username</span></div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em] block ml-1">Exophase Username</label>
                  <input
                    value={epicId || ''}
                    onChange={(e) => setEpicId(e.target.value)}
                    placeholder="e.g. MyEpicUsername"
                    className="w-full h-12 bg-[#030308] border border-white/5 rounded-xl px-4 text-white font-bold placeholder:text-white/10 focus:border-[#fbbf24]/50 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'gog' && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-[#fbbf24] mx-auto mb-4 opacity-20" />
              <p className="text-xs text-[#64748b] font-bold">GOG Galaxy sync is powered by local database discovery. Make sure GOG Galaxy is installed on your PC.</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
             <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-[#fbbf24] animate-pulse' : 'bg-[#64748b]'}`} />
                <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Engine Status</p>
             </div>
             <p className="text-xs text-white font-bold">{loading ? status : 'Ready to engage sync engine'}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
