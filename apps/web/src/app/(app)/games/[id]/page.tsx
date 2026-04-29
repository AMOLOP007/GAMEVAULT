'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatPlaytime, formatDate, getStatusBadgeClass } from '@/lib/utils';
import ProgressRing from '@/components/ui/ProgressRing';
import {
  ArrowLeft, Clock, Star, Heart, ExternalLink, Link2, Gamepad2, Play
} from 'lucide-react';

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      api.getGame(params.id as string)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-56 rounded-2xl" />
        <div className="skeleton h-36 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/8 flex items-center justify-center mx-auto mb-4 border border-[#8b5cf6]/15">
          <Gamepad2 className="w-8 h-8 text-[#8b5cf6]/30" />
        </div>
        <p className="text-lg font-bold text-white mb-4">Game not found</p>
        <button onClick={() => router.back()} className="btn-primary">Go Back</button>
      </div>
    );
  }

  const game = data.game;
  const achievementCount = data.userAchievements?.length || 0;
  const totalAchievements = game.achievements?.length || 0;
  const achievementProgress = totalAchievements > 0 ? (achievementCount / totalAchievements) * 100 : 0;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#64748b] hover:text-[#c084fc] transition-colors text-sm font-bold group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </button>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel overflow-hidden"
      >
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Cover */}
          <div className="w-44 h-60 rounded-xl overflow-hidden bg-[#0c0c1d] flex-shrink-0 border border-[#8b5cf6]/10 shadow-[0_0_30px_rgba(139,92,246,0.06)]">
            {game.coverUrl ? (
              <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🎮</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-black mb-2 text-white tracking-tight">{game.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={getStatusBadgeClass(data.status)}>{data.status}</span>
                  {data.isFavorite && <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />}
                  {data.rating && (
                    <span className="flex items-center gap-1 text-xs text-[#fbbf24] font-bold">
                      <Star className="w-3.5 h-3.5 fill-[#fbbf24]" />
                      {data.rating}/5
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  if ((window as any).gameVault) {
                    await (window as any).gameVault.launchGame(data.id);
                  } else {
                    alert("Launch only available in Desktop App");
                  }
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Play Now
              </button>
            </div>

            {game.description && (
              <p className="text-sm text-[#64748b] mb-4 line-clamp-3">{game.description}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <InfoBlock label="Playtime" value={formatPlaytime(data.totalPlaytime)} />
              <InfoBlock label="Sessions" value={String(data._count?.playSessions || 0)} />
              <InfoBlock label="Developer" value={game.developer || '—'} />
              <InfoBlock label="Platform" value={game.platform?.join(', ') || '—'} />
            </div>

            {game.genre?.length > 0 && (
              <div className="flex gap-1.5 mt-4 flex-wrap">
                {game.genre.map((g: string) => (
                  <span key={g} className="text-[10px] px-2.5 py-1 rounded-md bg-[#8b5cf6]/8 text-[#8b5cf6]/60 border border-[#8b5cf6]/10 font-bold uppercase tracking-wider">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-5">
          <h3 className="text-[11px] font-bold text-[#8b5cf6]/50 uppercase tracking-wider mb-3">Achievements</h3>
          <div className="flex items-center gap-4">
            <ProgressRing progress={achievementProgress} size={56} strokeWidth={4} color="#8b5cf6" />
            <div>
              <p className="text-lg font-black text-white">{achievementCount}/{totalAchievements}</p>
              <p className="text-[10px] text-[#475569] font-bold uppercase tracking-wider">Unlocked</p>
            </div>
          </div>
        </motion.div>

        {/* Last Played */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-5">
          <h3 className="text-[11px] font-bold text-[#8b5cf6]/50 uppercase tracking-wider mb-3">Last Played</h3>
          <p className="text-base font-black text-white">{data.lastPlayedAt ? formatDate(data.lastPlayedAt) : 'Never'}</p>
          <p className="text-[10px] text-[#475569] font-bold mt-1">
            {data.processName ? `Process: ${data.processName}` : 'No process linked'}
          </p>
        </motion.div>

        {/* Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5">
          <h3 className="text-[11px] font-bold text-[#8b5cf6]/50 uppercase tracking-wider mb-3">External Links</h3>
          <p className="text-base font-black text-white">{data.externalLinks?.length || 0}</p>
          <p className="text-[10px] text-[#475569] font-bold">Links attached</p>
        </motion.div>
      </div>

      {/* ── Play Sessions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-panel p-6">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <Clock className="w-4 h-4 text-[#c084fc]" />
            Play Sessions
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {data.playSessions?.length > 0 ? data.playSessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06 hover:border-[#8b5cf6]/12 transition-colors">
                <div>
                  <p className="text-sm font-bold text-white">{formatDate(s.startTime)}</p>
                  {s.exitStatus && <p className="text-[10px] text-[#475569] font-medium">Status: {s.exitStatus}</p>}
                </div>
                <span className="text-sm font-black text-[#c084fc]">{formatPlaytime(s.duration)}</span>
              </div>
            )) : (
              <p className="text-xs text-[#475569] text-center py-6 font-medium">No play sessions recorded</p>
            )}
          </div>
        </motion.div>

        {/* Trophies List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <Trophy className="w-4 h-4 text-[#fbbf24]" />
            Trophies
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {data.userAchievements?.length > 0 ? data.userAchievements.map((ach: any) => (
              <div 
                key={ach.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  ach.isEarned 
                    ? 'bg-[#fbbf24]/5 border-[#fbbf24]/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]' 
                    : 'bg-[#0c0c1d]/40 border-white/5 opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border ${
                  ach.isEarned ? 'border-[#fbbf24]/30' : 'border-white/10'
                }`}>
                  {ach.iconUrl ? (
                    <img src={ach.iconUrl} alt={ach.name} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <Trophy className={`w-5 h-5 ${ach.isEarned ? 'text-[#fbbf24]' : 'text-[#475569]'}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold truncate ${ach.isEarned ? 'text-white' : 'text-[#94a3b8]'}`}>
                      {ach.name}
                    </p>
                    {ach.isEarned && ach.earnedAt && (
                      <span className="text-[8px] font-black text-[#fbbf24] uppercase tracking-tighter shrink-0">
                        Unlocked {new Date(ach.earnedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#64748b] truncate leading-tight mt-0.5">
                    {ach.description || 'No description available'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10">
                <Trophy className="w-8 h-8 text-[#475569]/30 mb-2" />
                <p className="text-xs text-[#475569] font-medium">No trophies found for this game</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── External Links ── */}
      {data.externalLinks?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
            <Link2 className="w-4 h-4 text-[#60a5fa]" />
            External Links
          </h3>
          <div className="space-y-2">
            {data.externalLinks.map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06 hover:bg-[#8b5cf6]/04 hover:border-[#8b5cf6]/12 transition-all no-underline"
              >
                <ExternalLink className="w-4 h-4 text-[#60a5fa]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{link.label}</p>
                  <p className="text-[10px] text-[#475569] truncate">{link.url}</p>
                </div>
                <span className="text-[9px] px-2 py-1 rounded-md bg-[#8b5cf6]/6 text-[#8b5cf6]/50 font-bold uppercase tracking-wider border border-[#8b5cf6]/08">
                  {link.tag}
                </span>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-[#0c0c1d]/40 border border-[#8b5cf6]/06">
      <p className="text-[9px] text-[#475569] font-bold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
    </div>
  );
}
