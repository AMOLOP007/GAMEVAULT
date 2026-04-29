'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

export function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  disabled,
  type,
  onClick,
  ...props
}: AnimatedButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white border border-[#8b5cf6]/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]';
      case 'ghost': return 'bg-transparent text-[#94a3b8] border border-[#8b5cf6]/12 hover:bg-[#8b5cf6]/08 hover:text-white hover:border-[#8b5cf6]/25';
      case 'outline': return 'border border-[#8b5cf6]/15 bg-transparent hover:bg-[#8b5cf6]/06 text-[#c084fc]';
      case 'danger': return 'bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15';
      default: return 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'px-4 py-2.5 text-xs';
      case 'md': return 'px-6 py-3 text-sm';
      case 'lg': return 'px-8 py-4 text-base';
      default: return 'px-6 py-3 text-sm';
    }
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.03, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      disabled={disabled || loading}
      type={type}
      onClick={onClick as any}
      className={`relative rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 overflow-hidden ${getVariantClass()} ${getSizeClass()} ${className} ${disabled || loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-white/60">Loading...</span>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex items-center gap-2">
            {children}
          </div>
          {variant === 'primary' && !disabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 opacity-0 hover:opacity-100 transition-opacity" />
          )}
        </>
      )}
    </motion.button>
  );
}
