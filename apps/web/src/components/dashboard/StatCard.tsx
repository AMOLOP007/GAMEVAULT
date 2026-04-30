'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

export default function StatCard({ label, value, suffix = '', icon, color, delay = 0 }: StatCardProps | { label: string; value: string | number; suffix?: string; icon: React.ReactNode; color: string; delay?: number }) {
  const isNumeric = typeof value === 'number';
  const [displayValue, setDisplayValue] = useState<string | number>(isNumeric ? 0 : value);

  // Count up animation (only for numbers)
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const count = useTransform(spring, (val) => Math.floor(val));

  useEffect(() => {
    if (isNumeric) {
      spring.set(value as number);
    } else {
      setDisplayValue(value);
    }
  }, [value, spring, isNumeric]);

  useEffect(() => {
    if (isNumeric) {
      return count.on('change', (v) => setDisplayValue(v));
    }
  }, [count, isNumeric]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 100 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="relative group p-5 rounded-2xl bg-gradient-to-br from-[#111128]/90 to-[#08081a]/90 backdrop-blur-xl border border-[#8b5cf6]/10 overflow-hidden transition-all duration-400 hover:border-[#8b5cf6]/25"
      style={{ boxShadow: `0 0 0px transparent` }}
    >
      {/* Animated border glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `0 0 30px ${color}15, inset 0 0 30px ${color}05`,
        }}
      />

      {/* Corner glow */}
      <div
        className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* Gradient line at top */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2 min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#64748b] group-hover:text-[#94a3b8] transition-colors truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight tabular-nums">
              {displayValue}
            </span>
            {suffix && (
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                {suffix}
              </span>
            )}
          </div>
        </div>

        <div
          className="p-3 rounded-xl border transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          style={{
            backgroundColor: `${color}12`,
            borderColor: `${color}25`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-[3px] w-full bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: delay + 0.3, duration: 1.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />
      </div>
    </motion.div>
  );
}
