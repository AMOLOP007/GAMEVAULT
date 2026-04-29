'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function AmbientBackground() {
  return (
    <>
      {/* Hex grid pattern */}
      <div className="hex-grid-bg" aria-hidden="true" />

      {/* Floating orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Large purple orb — top left */}
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-[#8b5cf6] rounded-full blur-[180px] opacity-[0.06]"
        />

        {/* Medium violet orb — bottom right */}
        <motion.div
          animate={{
            x: [0, -100, 50, 0],
            y: [0, 80, -60, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#a855f7] rounded-full blur-[200px] opacity-[0.07]"
        />

        {/* Small deep purple orb — center */}
        <motion.div
          animate={{
            x: [0, 60, -30, 0],
            y: [0, -80, 50, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[15%] w-[35%] h-[35%] bg-[#6d28d9] rounded-full blur-[150px] opacity-[0.05]"
        />

        {/* Subtle violet accent — mid-left */}
        <motion.div
          animate={{
            x: [0, -40, 60, 0],
            y: [0, 50, -40, 0],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute top-[60%] left-[10%] w-[25%] h-[25%] bg-[#7c3aed] rounded-full blur-[120px] opacity-[0.04]"
        />
      </div>

      {/* Subtle scanlines */}
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
