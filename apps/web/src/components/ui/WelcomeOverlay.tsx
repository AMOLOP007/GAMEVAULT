'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, ShieldCheck, Zap } from 'lucide-react';

export default function WelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('gv_welcome_seen');
    if (!hasSeen) {
      setShow(true);
      localStorage.setItem('gv_welcome_seen', 'true');
      setTimeout(() => setShow(false), 6000);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#030308] overflow-hidden"
        >
          {/* Animated Background Particles */}
          <div className="absolute inset-0 pointer-events-none">
             {[...Array(20)].map((_, i) => (
               <motion.div
                 key={i}
                 initial={{ 
                   x: Math.random() * 100 + "%", 
                   y: Math.random() * 100 + "%", 
                   scale: 0,
                   opacity: 0 
                 }}
                 animate={{ 
                   y: [null, "-20%"], 
                   scale: [0, 1, 0],
                   opacity: [0, 0.5, 0] 
                 }}
                 transition={{ 
                   duration: 2 + Math.random() * 4, 
                   repeat: Infinity,
                   delay: Math.random() * 2 
                 }}
                 className="absolute w-1 h-1 bg-[#8b5cf6] rounded-full blur-[2px]"
               />
             ))}
          </div>

          <div className="relative z-10 text-center space-y-8 max-w-lg px-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(139,92,246,0.4)]"
            >
              <ShieldCheck className="w-12 h-12 text-white" />
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-black text-white tracking-tighter uppercase"
              >
                Welcome, <span className="gradient-text">Dweller</span>
              </motion.h1>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-[#64748b] text-sm font-bold uppercase tracking-[0.3em]"
              >
                The vault is officially online
              </motion.p>
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent"
            />

            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: <Sparkles />, label: 'Identity Set' },
                { icon: <Trophy />, label: 'Badge Earned' },
                { icon: <Zap />, label: 'Vault Linked' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 + i * 0.2 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#c084fc]">
                    {React.cloneElement(item.icon as any, { size: 18 })}
                  </div>
                  <span className="text-[8px] font-black text-[#475569] uppercase tracking-widest">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Epic Scanline Effect */}
          <div className="absolute inset-0 bg-scanline pointer-events-none opacity-10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
