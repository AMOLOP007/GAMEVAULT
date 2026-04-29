'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

interface AuthCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[460px] relative"
    >
      {/* Card */}
      <div className="p-8 sm:p-10 rounded-2xl bg-[#0c0c1d]/80 backdrop-blur-2xl border border-[#8b5cf6]/12 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(139,92,246,0.04)] relative overflow-hidden">
        {/* Corner glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#8b5cf6]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#a855f7]/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10">
          {title && (
            <div className="mb-8">
              <h2 className="text-3xl font-black mb-2 tracking-tight text-white">{title}</h2>
              {subtitle && <p className="text-[#94a3b8] text-sm">{subtitle}</p>}
            </div>
          )}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
