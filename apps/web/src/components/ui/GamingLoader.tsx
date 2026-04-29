'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface GamingLoaderProps {
  message?: string;
  fullscreen?: boolean;
}

const MESSAGES = [
  'Initializing systems...',
  'Loading game data...',
  'Syncing your vault...',
  'Establishing connection...',
  'Preparing the arena...',
];

export function GamingLoader({ message, fullscreen = false }: GamingLoaderProps) {
  const [displayMessage, setDisplayMessage] = useState(message || MESSAGES[0]);

  useEffect(() => {
    if (!message) {
      const interval = setInterval(() => {
        setDisplayMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [message]);

  const content = (
    <div className={`flex flex-col items-center justify-center p-8 ${fullscreen ? 'min-h-screen w-full bg-[#030308]/90 backdrop-blur-2xl z-[100]' : ''}`}>
      <div className="relative w-28 h-28 mb-10">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTop: '2px solid #8b5cf6',
            borderRight: '2px solid #8b5cf640',
          }}
        />

        {/* Middle counter-rotating ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderBottom: '1.5px solid #a855f7',
            borderLeft: '1.5px solid #a855f740',
          }}
        />

        {/* Inner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full"
          style={{
            border: '1px dashed #8b5cf630',
          }}
        />

        {/* Pulsing core */}
        <motion.div
          animate={{
            scale: [0.7, 1, 0.7],
            opacity: [0.3, 0.8, 0.3],
            boxShadow: [
              '0 0 20px rgba(139, 92, 246, 0.2)',
              '0 0 50px rgba(139, 92, 246, 0.5), 0 0 80px rgba(139, 92, 246, 0.2)',
              '0 0 20px rgba(139, 92, 246, 0.2)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-7 rounded-full bg-gradient-to-tr from-[#8b5cf6] to-[#c084fc]"
        />

        {/* Center diamond */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: [45, 225, 45], scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-3 h-3 bg-white shadow-[0_0_20px_#fff,0_0_40px_#8b5cf6]"
          />
        </div>
      </div>

      <div className="space-y-3 text-center">
        <motion.p
          key={displayMessage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-[#c084fc] font-bold tracking-[0.25em] text-[10px] uppercase"
        >
          {displayMessage}
        </motion.p>

        <motion.div
          animate={{ width: ['0%', '100%', '0%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="h-[1px] bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent mx-auto max-w-[200px]"
        />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999]">
        {content}
      </div>
    );
  }

  return content;
}
