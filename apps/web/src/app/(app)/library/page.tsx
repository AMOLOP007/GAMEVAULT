'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import GameCard from '@/components/library/GameCard';
import { Search, Plus, X, Library, Trophy } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { GamingLoader } from '@/components/ui/GamingLoader';
import { SkeletonCard } from '@/components/ui/Skeleton';

const STATUSES = ['ALL', 'PLAYING', 'COMPLETED', '100% CLUB', 'REPLAY LIST', 'DROPPED', 'BACKLOG', 'WISHLIST'];

const STATUS_COLORS: Record<string, string> = {
  ALL: '#8b5cf6',
  PLAYING: '#34d399',
  COMPLETED: '#60a5fa',
  '100% CLUB': '#fbbf24',
  'REPLAY LIST': '#f59e0b',
  DROPPED: '#f87171',
  BACKLOG: '#64748b',
  WISHLIST: '#c084fc',
};

export default function LibraryPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      if (!(window as any).gameVault) throw new Error("No Bridge");
      const discovered = await (window as any).gameVault.discoverLibrary();
      if (discovered.length > 0) {
        if (confirm(`Discovered ${discovered.length} games. Add them all to your library?`)) {
          await (window as any).gameVault.confirmDiscovery(discovered);
          alert("Games added successfully!");
          loadGames();
        }
      } else {
        alert("No new games discovered.");
      }
    } catch (err) {
      alert("Please use the desktop app to discover local games. If you are already on desktop, check if the bridge is initialized.");
    } finally {
      setDiscovering(false);
    }
  };

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter === '100% CLUB') {
        filters.is100Percent = true;
      } else if (statusFilter === 'REPLAY LIST') {
        filters.wouldReplay = true;
      } else if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      } else if (statusFilter === 'ALL') {
        filters.excludeStatus = 'COMPLETED';
      }
      
      if (search) filters.search = search;
      const data = await api.getGames(filters);
      setGames(data);
    } catch (err) {
      console.error('[Library] Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Track whether this is the initial mount to avoid double-fetching.
  // The debounced effect below fires on every loadGames change (i.e. filter/search).
  // Without this guard, initial mount would trigger two simultaneous fetches.
  const isMounted = useRef(false);

  useEffect(() => {
    // Register library update listener (desktop bridge)
    if ((window as any).gameVault) {
      (window as any).gameVault.onLibraryUpdated(() => {
        loadGames();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Skip the debounce on the very first render — fire immediately instead
    if (!isMounted.current) {
      isMounted.current = true;
      loadGames();
      return;
    }
    const debounce = setTimeout(loadGames, 300);
    return () => clearTimeout(debounce);
  }, [loadGames]);

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/15">
              <Library className="w-5 h-5 text-[#c084fc]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Game Library
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#64748b] font-medium text-sm ml-[52px]"
          >
            Managing <span className="text-[#c084fc] font-bold">{games.length}</span> titles in your vault
          </motion.p>
        </div>
        <div className="flex gap-2">
          <AnimatedButton
            onClick={handleDiscover}
            disabled={discovering}
            variant="ghost"
            className="border-[#8b5cf6]/20 text-[#8b5cf6]"
          >
            {discovering ? 'Discovering...' : 'Discover Games'}
          </AnimatedButton>
          <AnimatedButton
            onClick={async () => {
              if (confirm('Are you sure you want to clear your library? This will remove all local associations.')) {
                await api.delete('/api/games/clear');
                loadGames();
              }
            }}
            variant="ghost"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
          >
            Reset Library
          </AnimatedButton>
          <AnimatedButton
            onClick={() => setShowAddModal(true)}
            className="shadow-[0_0_20px_rgba(139,92,246,0.15)]"
          >
            <Plus className="w-4 h-4" />
            Add Game
          </AnimatedButton>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="w-full lg:max-w-md">
          <AnimatedInput
            icon={<Search className="w-4 h-4" />}
            placeholder="Search titles, genres, or platforms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5 p-1 bg-[#0c0c1d] rounded-xl border border-[#8b5cf6]/08 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all uppercase tracking-[0.1em] ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                  : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#8b5cf6]/06'
              }`}
            >
              {s === 'ALL' ? 'All Games' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Game Grid ── */}
      <AnimatePresence>
        {loading && games.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5"
          >
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        ) : games.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 glass-panel border-dashed border-2 border-[#8b5cf6]/15"
          >
            <div className="w-16 h-16 bg-[#8b5cf6]/8 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#8b5cf6]/15">
              <span className="text-3xl">🎮</span>
            </div>
            <h2 className="text-xl font-black mb-2 text-white">No matches found</h2>
            <p className="text-[#64748b] max-w-sm mx-auto mb-6 text-sm">
              {search ? `Nothing matches "${search}"` : "Your vault is empty. Let's fill it up!"}
            </p>
            {!search && (
              <AnimatedButton onClick={() => setShowAddModal(true)} size="lg">
                <Plus className="w-5 h-5" />
                Add Your First Game
              </AnimatedButton>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5"
          >
            {games.map((g) => (
              <GameCard
                key={g.id}
                id={g.id}
                title={g.game.title}
                coverUrl={g.game.coverUrl}
                status={g.status}
                totalPlaytime={g.totalPlaytime}
                isFavorite={g.isFavorite}
                genre={g.game.genre}
                rating={g.rating}
                notes={g.notes}
                is100Percent={g.is100Percent}
                wouldReplay={g.wouldReplay}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Game Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddGameModal onClose={() => setShowAddModal(false)} onAdded={loadGames} />
        )}
        {showSyncModal && (
          <SteamSyncModal onClose={() => setShowSyncModal(false)} onSynced={loadGames} games={games} />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddGameModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('BACKLOG');
  const [exePath, setExePath] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      if ((window as any).gameVault?.selectFile) {
        const path = await (window as any).gameVault.selectFile();
        if (path) {
          setExePath(path);
          // Auto-fill title from filename if empty
          if (!title) {
            const filename = path.split(/[\\/]/).pop();
            const dotIndex = filename.lastIndexOf('.');
            const name = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
            setTitle(name);
          }
        }
      } else {
        alert("File selection is only available in the Desktop App");
      }
    } catch (err) {
      console.error('File selection failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filename = exePath ? exePath.split(/[\\/]/).pop() : undefined;
      await api.addGame({
        title,
        status,
        exePath: exePath || undefined,
        processName: filename,
        platform: ['PC'], // Hardcoded as requested
        // Genre will be fetched by API from RAWG based on title
      });
      onAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to add game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030308]/85 backdrop-blur-lg p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0c0c1d] border border-[#8b5cf6]/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(139,92,246,0.06)] overflow-hidden"
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent opacity-40" />

        <div className="p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white">Add to Vault</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#8b5cf6]/08 transition-colors group">
              <X className="w-5 h-5 text-[#475569] group-hover:text-[#c084fc]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            <AnimatedInput
              label="Game Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter game title..."
              required
            />

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#8b5cf6]/60 uppercase tracking-[0.12em] block ml-0.5">
                Executable / File
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exePath}
                  onChange={(e) => setExePath(e.target.value)}
                  placeholder="Select a file (EXE, BAT, etc.)..."
                  className="input-field flex-1 text-sm bg-[#08081a]"
                />
                <AnimatedButton type="button" onClick={handleSelectFile} variant="ghost" className="border-[#8b5cf6]/20 text-[#8b5cf6]">
                  Browse
                </AnimatedButton>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#8b5cf6]/60 uppercase tracking-[0.12em] block ml-0.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field cursor-pointer text-sm"
              >
                <option value="PLAYING">Playing</option>
                <option value="COMPLETED">Completed</option>
                <option value="BACKLOG">Backlog</option>
                <option value="WISHLIST">Wishlist</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <AnimatedButton variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </AnimatedButton>
              <AnimatedButton type="submit" loading={loading} className="flex-1">
                Add to Vault
              </AnimatedButton>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SteamSyncModal({ onClose, onSynced, games }: { onClose: () => void; onSynced: () => void; games: any[] }) {
  const [steamId, setSteamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSync = async () => {
    if (!steamId) return alert('Please enter your Steam ID or Profile URL');
    setLoading(true);
    setStatus('Initializing scraper...');

    try {
      // Find games with steamAppId
      const steamGames = games.filter(g => g.game.steamAppId);
      
      if (steamGames.length === 0) {
        alert('No Steam games found in your library. Add games with Steam App IDs first!');
        setLoading(false);
        return;
      }

      let syncedCount = 0;
      for (const g of steamGames) {
        setStatus(`Syncing ${g.game.title}...`);
        const response: any = await api.post('/api/sync/steam-public', {
          steamId,
          gameId: g.game.id,
          steamAppId: g.game.steamAppId.toString()
        });
        if (response.count > 0) syncedCount++;
      }

      alert(`Sync Complete! Achievements found for ${syncedCount} games.`);
      onSynced();
      onClose();
    } catch (err: any) {
      alert(`Sync failed: ${err.message || 'Unknown error'}. Make sure your Steam profile is set to Public!`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030308]/85 backdrop-blur-lg p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0c0c1d] border border-[#fbbf24]/20 rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-[#fbbf24]/10 text-[#fbbf24]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Public Steam Sync</h2>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">No API Key Required</p>
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Sync your achievements by scraping your public Steam profile. Your profile and game details **must be set to Public** in Steam settings.
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#8b5cf6]/60 uppercase tracking-[0.12em] block ml-0.5">Steam ID / Custom URL</label>
            <input
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              placeholder="e.g. 76561198000000000 or custom_url"
              disabled={loading}
              className="input-field"
            />
          </div>

          <div className="bg-[#fbbf24]/05 border border-[#fbbf24]/10 rounded-xl p-4">
            <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs text-white font-medium">{loading ? status : 'Ready to sync'}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <AnimatedButton variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </AnimatedButton>
            <AnimatedButton onClick={handleSync} loading={loading} className="flex-1 bg-[#fbbf24] text-[#0c0c1d] hover:bg-[#f59e0b]">
              Start Sync
            </AnimatedButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
