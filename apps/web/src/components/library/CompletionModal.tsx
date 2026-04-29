'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, MessageCircle, RotateCcw, X, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface CompletionModalProps {
  game: {
    id: string;
    title: string;
    rating?: number;
    notes?: string;
    is100Percent?: boolean;
    wouldReplay?: boolean;
  };
  onClose: () => void;
  onUpdated: () => void;
}

export default function CompletionModal({ game, onClose, onUpdated }: CompletionModalProps) {
  const [rating, setRating] = useState(game.rating || 5);
  const [notes, setNotes] = useState(game.notes || '');
  const [is100Percent, setIs100Percent] = useState(game.is100Percent || false);
  const [wouldReplay, setWouldReplay] = useState(game.wouldReplay || false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateGame(game.id, {
        rating,
        notes,
        is100Percent,
        wouldReplay,
        status: 'COMPLETED'
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#030308]/90 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0c0c1d] border border-[#8b5cf6]/20 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-8 bg-gradient-to-br from-[#8b5cf6]/10 to-transparent">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 text-[#0c0c1d]">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Mission Accomplished</h2>
              <p className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest">{game.title}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {/* Rating */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Star className="w-3 h-3 text-yellow-500" /> Rate Your Experience
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className={`flex-1 h-12 rounded-xl text-sm font-black transition-all border ${
                    rating >= num 
                      ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIs100Percent(!is100Percent)}
              className={`p-5 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                is100Percent 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${is100Percent ? 'bg-green-500/20' : 'bg-white/5'}`}>
                <Check className={`w-4 h-4 ${is100Percent ? 'opacity-100' : 'opacity-20'}`} />
              </div>
              <div>
                <p className="text-sm font-black">100% Clear</p>
                <p className="text-[10px] font-bold opacity-60">Mastered everything</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setWouldReplay(!wouldReplay)}
              className={`p-5 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                wouldReplay 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${wouldReplay ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                <RotateCcw className={`w-4 h-4 ${wouldReplay ? 'opacity-100' : 'opacity-20'}`} />
              </div>
              <div>
                <p className="text-sm font-black">New Game+</p>
                <p className="text-[10px] font-bold opacity-60">I'd play this again</p>
              </div>
            </button>
          </div>

          {/* Comment */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageCircle className="w-3 h-3 text-[#8b5cf6]" /> Final Thoughts
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What made this game special? Leave a legacy note..."
              rows={4}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-[#8b5cf6]/40 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-black text-sm uppercase tracking-widest shadow-[0_10px_40px_rgba(139,92,246,0.3)] hover:shadow-[0_15px_50px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Close the Vault Entry'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
