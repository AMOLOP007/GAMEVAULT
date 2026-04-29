'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BarChart3, Star, Trash2, Settings, ExternalLink } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'primary' | 'success';
  }>;
}

export default function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onClose]);

  // Adjust position if it goes off screen
  const adjustedX = typeof window !== 'undefined' && x + 200 > window.innerWidth ? x - 200 : x;
  const adjustedY = typeof window !== 'undefined' && y + 300 > window.innerHeight ? y - 300 : y;

  return (
    <div 
      className="fixed z-[300] pointer-events-none" 
      style={{ left: adjustedX, top: adjustedY }}
    >
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="pointer-events-auto min-w-[200px] bg-[#0c0c1d]/95 backdrop-blur-xl border border-[#8b5cf6]/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.1)] p-1.5 overflow-hidden"
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
              item.variant === 'danger' 
                ? 'hover:bg-red-500/10 text-red-400/70 hover:text-red-400' 
                : item.variant === 'primary'
                ? 'hover:bg-[#8b5cf6]/20 text-[#c084fc]'
                : item.variant === 'success'
                ? 'hover:bg-green-500/10 text-green-400/70 hover:text-green-400'
                : 'hover:bg-white/5 text-[#94a3b8] hover:text-white'
            }`}
          >
            <div className={`p-1.5 rounded-md transition-colors ${
              item.variant === 'danger' ? 'group-hover:bg-red-500/10' : 'group-hover:bg-[#8b5cf6]/10'
            }`}>
              {item.icon}
            </div>
            <span className="text-xs font-bold tracking-wide">{item.label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
