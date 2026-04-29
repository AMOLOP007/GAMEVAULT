'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

export default function TrophyNotification() {
  const [trophy, setTrophy] = useState<any>(null);

  useEffect(() => {
    if ((window as any).gameVault) {
      (window as any).gameVault.onOverlayTrophy((data: any) => {
        setTrophy(data);
        setTimeout(() => setTrophy(null), 6000); // Show for 6 seconds
      });
    }
  }, []);

  const isVault = trophy?.type === 'vault' || trophy?.type === 'first_launch';
  const glowColor = isVault ? '#10b981' : '#8b5cf6'; // Emerald for Vault, Violet for Official
  const accentColor = isVault ? '#34d399' : '#c084fc';

  return (
    <AnimatePresence>
      {trophy && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(20px)' }}
          className="fixed top-6 right-6 z-[300] pointer-events-none"
        >
          {/* Main Container */}
          <div className="relative group">
            {/* Background Glow */}
            <div 
              className="absolute inset-0 blur-[40px] opacity-20 animate-pulse" 
              style={{ backgroundColor: glowColor }}
            />
            
            <div 
              className={`relative flex items-center gap-4 p-5 rounded-xl bg-[#0c0c1d]/90 backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-colors duration-500`}
              style={{ borderColor: `${glowColor}40`, boxShadow: `0 0 30px ${glowColor}30` }}
            >
              {/* Trophy Icon with Ring */}
              <div className="relative">
                <motion.div 
                  animate={isVault ? { 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  } : { 
                    rotate: [0, 15, -15, 0] 
                  }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.3)]`}
                  style={{ background: isVault ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  {isVault ? <Sparkles className="w-6 h-6 text-white" /> : <Trophy className="w-6 h-6 text-[#0c0c1d] fill-current" />}
                </motion.div>
              </div>

              {/* Text Info */}
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="w-3 h-3" style={{ color: isVault ? '#10b981' : '#fbbf24' }} />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: glowColor }}>
                    {isVault ? 'Vault Challenge' : 'Official Trophy'}
                  </span>
                </div>
                <h4 className="text-base font-black text-white tracking-tight leading-tight">{trophy.title}</h4>
                <p className="text-[11px] text-[#94a3b8] font-bold">{trophy.message}</p>
              </div>

              {/* Game Tag */}
              <div className="pl-4 border-l border-white/10">
                <div className="text-right">
                  <p className="text-[8px] font-bold text-[#475569] uppercase tracking-wider mb-0.5">Verified</p>
                  <div 
                    className="px-2 py-0.5 rounded-md text-[9px] font-black border whitespace-nowrap"
                    style={{ backgroundColor: `${glowColor}20`, color: accentColor, borderColor: `${glowColor}30` }}
                  >
                    {trophy.gameTitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Particle Effects (CSS only for speed) */}
            <div className="absolute -inset-2 pointer-events-none overflow-hidden rounded-3xl">
               <div className="sparkle-1" />
               <div className="sparkle-2" />
               <div className="sparkle-3" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
