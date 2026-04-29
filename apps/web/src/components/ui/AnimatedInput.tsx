'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
}

export function AnimatedInput({
  label,
  icon,
  error,
  className = '',
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  minLength,
  disabled,
}: AnimatedInputProps) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="text-[11px] font-bold text-[#8b5cf6]/60 uppercase tracking-[0.12em] block ml-0.5">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] group-focus-within:text-[#8b5cf6] transition-colors duration-300">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          disabled={disabled}
          className={`w-full bg-[#0c0c1d] border border-[#8b5cf6]/10 rounded-xl px-4 py-3.5 text-[14px] text-white outline-none transition-all duration-300 hover:border-[#8b5cf6]/20 focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/15 focus:shadow-[0_0_20px_rgba(139,92,246,0.08)] placeholder:text-[#334155] ${icon ? 'pl-12' : ''} ${error ? 'border-red-500/40 focus:ring-red-500/15 focus:border-red-500' : ''} ${className}`}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-medium text-red-400 ml-0.5"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
