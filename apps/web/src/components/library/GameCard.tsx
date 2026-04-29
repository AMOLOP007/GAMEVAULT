'use client';

import React, { memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { formatPlaytime, getStatusBadgeClass } from '@/lib/utils';
import { Clock, Star, Heart, Play, BarChart3, Settings, Trash2, ExternalLink, RotateCcw, Trophy as TrophyIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { SafeImage } from '../ui/SafeImage';
import ContextMenu from './ContextMenu';
import AnalyticsModal from './AnalyticsModal';
import CompletionModal from './CompletionModal';
import { api } from '@/lib/api';
import { AnimatePresence } from 'framer-motion';

interface GameCardProps {
  id: string;
  title: string;
  coverUrl?: string | null;
  status: string;
  totalPlaytime: number;
  isFavorite: boolean;
  genre?: string | string[];
  rating?: number | null;
  notes?: string | null;
  is100Percent?: boolean;
  wouldReplay?: boolean;
}

const GameCard = memo(function GameCard({
  id, title, coverUrl, status, totalPlaytime, isFavorite, genre, rating, notes, is100Percent, wouldReplay,
}: GameCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [showCompletion, setShowCompletion] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleLaunch = async () => {
    try {
      if ((window as any).gameVault) {
        await (window as any).gameVault.launchGame(id);
      } else {
        alert("Launch only available in Desktop App");
      }
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  const handleManualLaunch = async () => {
    try {
      if ((window as any).gameVault) {
        await (window as any).gameVault.launchGame(id, { forceExe: true });
      } else {
        alert("Launch only available in Desktop App");
      }
    } catch (err) {
      console.error('Manual launch failed:', err);
    }
  };

  const menuItems = [
    { 
      label: 'Launch Game', 
      icon: <Play className="w-4 h-4 fill-current" />, 
      onClick: handleLaunch,
      variant: 'primary' as const
    },
    { 
      label: 'Mark as Played', 
      icon: <TrophyIcon className="w-4 h-4" />, 
      onClick: () => setShowCompletion(true),
      variant: 'success' as const
    },
    { 
      label: 'Manual Launch (EXE)', 
      icon: <ExternalLink className="w-4 h-4" />, 
      onClick: handleManualLaunch 
    },
    { 
      label: 'View Analytics', 
      icon: <BarChart3 className="w-4 h-4" />, 
      onClick: () => setShowAnalytics(true) 
    },
    { 
      label: 'Sync Metadata', 
      icon: <RefreshCw className="w-4 h-4" />, 
      onClick: async () => {
        await api.post(`/api/games/${id}/sync-metadata`);
        window.location.reload();
      } 
    },
    { 
      label: isFavorite ? 'Remove Favorite' : 'Mark as Favorite', 
      icon: <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />, 
      onClick: async () => {
        await api.patch(`/api/games/${id}`, { isFavorite: !isFavorite });
        window.location.reload(); 
      } 
    },
    { 
      label: 'Game Settings', 
      icon: <Settings className="w-4 h-4" />, 
      onClick: () => {} 
    },
    { 
      label: 'Remove from Vault', 
      icon: <Trash2 className="w-4 h-4" />, 
      onClick: () => {
        if(confirm(`Are you sure you want to remove ${title} from your library?`)) {
          api.delete(`/api/games/${id}`).then(() => window.location.reload());
        }
      },
      variant: 'danger' as const
    },
  ];

  return (
    <>
      <div onContextMenu={handleContextMenu} className="h-full">
        <Link href={`/games/${id}`} className="no-underline block h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.4 }}
            className="game-card h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <motion.div
              style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }}
              className="overflow-hidden h-full flex flex-col rounded-xl bg-gradient-to-b from-[#111128]/90 to-[#08081a]/95 border border-[#8b5cf6]/10 hover:border-[#8b5cf6]/25 transition-all duration-400 hover:shadow-[0_0_30px_rgba(139,92,246,0.08),0_20px_40px_rgba(0,0,0,0.4)]"
            >
              {/* Cover Image */}
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#0c0c1d]" style={{ transform: "translateZ(30px)" }}>
                <SafeImage
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full"
                  fallbackText={title.charAt(0)}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#08081a] via-[#08081a]/20 to-transparent pointer-events-none" />

                {/* Top highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />

                {/* Favorite badge */}
                {isFavorite && (
                  <div className="absolute top-2.5 right-2.5" style={{ transform: "translateZ(40px)" }}>
                    <div className="p-1.5 rounded-lg bg-[#08081a]/60 backdrop-blur-sm border border-pink-500/20">
                      <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.5)]" />
                    </div>
                  </div>
                )}

                {/* Status badge */}
                <div className="absolute bottom-2.5 left-2.5" style={{ transform: "translateZ(40px)" }}>
                  <span className={`${getStatusBadgeClass(status)}`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between" style={{ transform: "translateZ(20px)" }}>
                <div>
                  <h3 className="text-[13px] font-bold truncate mb-2 text-white" title={title}>{title}</h3>

                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-[#8b5cf6]" />
                      {formatPlaytime(totalPlaytime)}
                    </span>
                    {rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 text-[#fbbf24] fill-[#fbbf24]" />
                        {rating}/10
                      </span>
                    )}
                  </div>
                  {(is100Percent || wouldReplay) && (
                    <div className="flex gap-1.5 mt-1.5">
                       {is100Percent && <div className="p-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-500" title="100% Completed"><TrophyIcon className="w-2.5 h-2.5" /></div>}
                       {wouldReplay && <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400" title="Would Replay"><RotateCcw className="w-2.5 h-2.5" /></div>}
                    </div>
                  )}
                </div>

                {(() => {
                  const genresList = Array.isArray(genre) 
                    ? genre 
                    : (typeof genre === 'string' ? genre.split(',').map(g => g.trim()) : []);
                  
                  if (genresList.length === 0) return null;
                  
                  return (
                    <div className="flex gap-1 mt-2.5 flex-wrap">
                      {genresList.slice(0, 2).map((g) => (
                        <span key={g} className="text-[8px] px-2 py-0.5 rounded-md bg-[#8b5cf6]/8 text-[#8b5cf6]/60 border border-[#8b5cf6]/10 font-bold uppercase tracking-wider">
                          {g}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        </Link>
      </div>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            items={menuItems} 
            onClose={() => setContextMenu(null)} 
          />
        )}
        {showAnalytics && (
          <AnalyticsModal 
            gameId={id} 
            onClose={() => setShowAnalytics(false)} 
            onLaunch={handleLaunch}
          />
        )}
        {showCompletion && (
          <CompletionModal
            game={{ id, title, rating: rating || undefined, notes: notes || undefined, is100Percent, wouldReplay }}
            onClose={() => setShowCompletion(false)}
            onUpdated={() => window.location.reload()}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default GameCard;
