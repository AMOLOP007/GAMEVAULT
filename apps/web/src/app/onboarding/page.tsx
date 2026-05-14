'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Search, Plus, Check, ArrowRight, Loader2, Gamepad2, Sparkles } from 'lucide-react';
import AmbientBackground from '@/components/effects/AmbientBackground';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'identity' | 'vault'>('identity');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // 21 Built-in avatars for a perfect grid
  const avatarSeeds = [
    'Amol', 'Gamer', 'Vault', 'Cyber', 'Pixel', 'Hero', 'Boss', 'Ghost', 'Shadow', 'Light',
    'Fire', 'Ice', 'Star', 'Moon', 'Sun', 'Earth', 'Mars', 'Venus', 'Jupiter', 'Saturn', 'Galactic'
  ];

  const colors = [
    'from-blue-500/20 to-purple-500/20',
    'from-emerald-500/20 to-cyan-500/20',
    'from-orange-500/20 to-rose-500/20',
    'from-indigo-500/20 to-violet-500/20',
    'from-fuchsia-500/20 to-pink-500/20'
  ];

  // Games the user has selected to add to their library
  const [selectedGames, setSelectedGames] = useState<any[]>([]);
  const [addingStatus, setAddingStatus] = useState<string>('');
  const [legendaryLoaded, setLegendaryLoaded] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!api.getToken()) {
        router.push('/login');
        return;
      }
      try {
        const user = await api.getMe();
        if (user && user.avatarUrl && user.avatarUrl.length > 0) {
          // If they already have an avatar, maybe they want to re-choose?
          // For now, let's just let them stay on step 1 if they specifically navigated here
        }
      } catch (err) {
        console.error('Failed to check profile:', err);
      }
    };
    checkProfile();
  }, [router]);

  useEffect(() => {
    if (step !== 'vault' || search.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchGamesAPI(search);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [search, step]);

  const handleAvatarSelect = async (seed: string) => {
    const url = seed === 'LEGENDARY_CYBERPUNK'
      ? '/cyberpunk_avatar_1.png'
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
      
    setSelectedAvatar(url);
    try {
      await api.updateProfile({ avatarUrl: url });
      setStep('vault');
    } catch (err) {
      console.error('Failed to update avatar:', err);
      setStep('vault');
    }
  };

  const handleCustomAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you'd upload this to a storage provider (S3/Supabase Storage)
    // For now, we'll use a FileReader to show a preview and simulated upload
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setCustomAvatar(base64);
      try {
        // Since we don't have a file upload endpoint, we'll store the base64 URL 
        // (Note: This is not ideal for large images, but works for local dev)
        await api.updateProfile({ avatarUrl: base64 });
        setStep('vault');
      } catch (err) {
        console.error('Failed to update custom avatar:', err);
        setStep('vault');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleGame = (game: any) => {
    if (selectedGames.some(g => g.rawgId === game.rawgId)) {
      setSelectedGames(prev => prev.filter(g => g.rawgId !== game.rawgId));
    } else {
      setSelectedGames(prev => [...prev, game]);
    }
  };

  const handleFinish = async () => {
    if (selectedGames.length === 0) {
      router.push('/dashboard');
      return;
    }
    setAddingStatus('loading');
    try {
      await Promise.all(
        selectedGames.map(game =>
          api.addGame({
            title: game.title,
            genre: game.genre || [],
            platform: game.platform || [],
            status: 'backlog',
            coverUrl: game.coverUrl || undefined,
          })
        )
      );
      setAddingStatus('success');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err) {
      console.error('Failed to add games:', err);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white relative overflow-hidden selection:bg-[#8b5cf6]/30">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="max-w-4xl w-full mx-auto px-6 sm:px-8 flex-1 flex flex-col pt-16 pb-32">

          <AnimatePresence mode="wait">
            {step === 'identity' ? (
              <motion.div
                key="identity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center"
              >
                <div className="text-center mb-12">
                  <div className="w-16 h-16 rounded-3xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                    <Sparkles className="w-8 h-8 text-[#fbbf24]" />
                  </div>
                  <h1 className="text-4xl font-black mb-4 tracking-tight uppercase">Choose Your Identity</h1>
                  <p className="text-[#64748b] text-sm max-w-lg mx-auto font-bold uppercase tracking-widest">
                    Pick a starting avatar or upload your own legend.
                  </p>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-6 mb-12">
                  {/* Legendary 4K Avatar */}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAvatarSelect('LEGENDARY_CYBERPUNK')}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0c0c1d] border-2 border-[#fbbf24] overflow-hidden shadow-[0_0_25px_rgba(251,191,36,0.25)] relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-transparent to-orange-500/30 animate-pulse" />
                    {!legendaryLoaded && <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c1d]"><Loader2 className="w-5 h-5 text-[#fbbf24] animate-spin" /></div>}
                    <img 
                      src="/cyberpunk_avatar_1.png" 
                      alt="Legendary"
                      onLoad={() => setLegendaryLoaded(true)}
                      className={`w-full h-full object-cover group-hover:scale-110 transition-transform ${legendaryLoaded ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 backdrop-blur-sm border-t border-white/10">
                      <p className="text-[7px] font-black uppercase text-[#fbbf24] text-center tracking-[0.1em]">Legendary</p>
                    </div>
                    <div className="absolute top-1 right-1">
                      <Sparkles className="w-3 h-3 text-[#fbbf24] fill-current" />
                    </div>
                  </motion.button>

                  {avatarSeeds.map((seed, idx) => (
                    <motion.button
                      key={seed}
                      whileHover={{ scale: 1.1, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAvatarSelect(seed)}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0c0c1d] border border-white/5 overflow-hidden hover:border-white/20 transition-all group relative"
                    >
                      {/* Animated Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors[idx % colors.length]} animate-pulse`} style={{ animationDuration: `${3 + idx % 3}s` }} />
                      
                      <img 
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`} 
                        alt={seed}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-10"
                      />
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                  
                  {/* Custom Upload Button */}
                  <label className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0c0c1d] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/5 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent group-hover:opacity-100 transition-opacity opacity-50" />
                    <Plus className="w-6 h-6 text-[#64748b] group-hover:text-[#fbbf24] relative z-10" />
                    <span className="text-[8px] font-black uppercase text-[#64748b] mt-1 group-hover:text-[#fbbf24] relative z-10">Custom</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleCustomAvatar} />
                  </label>
                </div>

                <button
                  onClick={() => setStep('vault')}
                  className="text-[#64748b] text-xs font-black uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                  I'll do this later
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* ── Header ── */}
                <div className="text-center mb-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                  >
                    <Gamepad2 className="w-7 h-7 text-[#8b5cf6]" />
                  </motion.div>
                  <h1 className="text-3xl font-black mb-3 tracking-tight">Build Your Vault</h1>
                  <p className="text-[#64748b] text-sm max-w-lg mx-auto font-medium">
                    Search for games you own, play, or want to play. We'll grab covers, genres, and platforms automatically.
                  </p>
                </div>

                {/* ── Search Bar ── */}
                <div className="relative max-w-2xl w-full mx-auto mb-8">
                  <div className="relative group">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by game title..."
                      className="w-full bg-[#0c0c1d] border border-[#8b5cf6]/10 rounded-2xl px-6 py-4 pl-14 text-base outline-none transition-all group-hover:border-[#8b5cf6]/20 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/15 focus:shadow-[0_0_30px_rgba(139,92,246,0.08)] placeholder:text-[#334155]"
                    />
                    {searching ? (
                      <Loader2 className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-[#8b5cf6] animate-spin" />
                    ) : (
                      <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-[#475569] group-focus-within:text-[#8b5cf6] transition-colors" />
                    )}
                  </div>

                  <AnimatePresence>
                    {results.length > 0 && search.length >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute w-full mt-2 bg-[#0c0c1d] border border-[#8b5cf6]/15 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-h-72 overflow-y-auto z-50 p-2 space-y-0.5"
                      >
                        {results.map((res: any) => {
                          const isSelected = selectedGames.some(g => g.rawgId === res.rawgId);
                          return (
                            <div
                              key={res.rawgId}
                              onClick={() => toggleGame(res)}
                              className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${
                                isSelected ? 'bg-[#8b5cf6]/12 border border-[#8b5cf6]/30' : 'hover:bg-[#8b5cf6]/04 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#08081a] shrink-0 relative border border-[#8b5cf6]/08">
                                  {res.coverUrl && <img src={res.coverUrl} alt={res.title} className="w-full h-full object-cover" />}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-[#8b5cf6]/60 flex items-center justify-center">
                                      <Check className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{res.title}</p>
                                  <p className="text-[10px] text-[#475569] font-bold mt-0.5">{res.genre?.slice(0, 3).join(', ')}</p>
                                </div>
                              </div>
                              <button className={`p-1.5 rounded-lg ${isSelected ? 'bg-transparent' : 'bg-[#8b5cf6]/06 hover:bg-[#8b5cf6]/12'}`}>
                                {isSelected ? <Check className="w-3.5 h-3.5 text-[#c084fc]" /> : <Plus className="w-3.5 h-3.5 text-[#64748b]" />}
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1" />
        </div>

        {/* ── Footer Elements ── */}
        <AnimatePresence>
          {step === 'vault' && selectedGames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4"
            >
              <div className="max-w-4xl mx-auto bg-[#0c0c1d]/95 border border-[#8b5cf6]/20 backdrop-blur-xl p-4 rounded-2xl flex items-center justify-between shadow-[0_-10px_50px_rgba(139,92,246,0.12)]">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selectedGames.slice(0, 5).map((g, i) => (
                      <img key={i} src={g.coverUrl || ''} className="w-9 h-9 rounded-lg border-2 border-[#0c0c1d] object-cover bg-[#08081a]" />
                    ))}
                    {selectedGames.length > 5 && (
                      <div className="w-9 h-9 rounded-lg border-2 border-[#0c0c1d] bg-[#8b5cf6]/10 flex items-center justify-center text-[10px] font-black text-[#c084fc]">
                        +{selectedGames.length - 5}
                      </div>
                    )}
                  </div>
                  <div className="ml-1">
                    <p className="font-bold text-sm text-white">{selectedGames.length} games selected</p>
                    <p className="text-[10px] text-[#64748b] font-medium">Added to your backlog</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFinish}
                  disabled={addingStatus !== ''}
                  className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50"
                >
                  {addingStatus === 'loading' ? 'Importing...' : addingStatus === 'success' ? 'Done!' : 'Import Library'}
                  {addingStatus === '' && <ArrowRight className="w-4 h-4" />}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 'vault' && selectedGames.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-transparent border border-[#8b5cf6]/10 text-[#64748b] hover:text-[#c084fc] hover:bg-[#8b5cf6]/04 hover:border-[#8b5cf6]/20 transition-all text-sm font-bold"
            >
              Skip to Dashboard
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
