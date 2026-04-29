'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function BugReportSection() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('UI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      await api.post('/bug-reports', { title, description, category });
      setStatus('success');
      setTitle('');
      setDescription('');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-panel p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#ef4444]/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
          <Bug className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">Report a Bug</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Help us improve the vault</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-white font-bold mb-1">Report Received!</h3>
            <p className="text-slate-400 text-xs">Our dwarves are on it. Thank you!</p>
          </motion.div>
        ) : (
          <form key="form" onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <input
                type="text"
                placeholder="What's wrong? (e.g. Game not launching)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
                required
              />
            </div>
            
            <div className="flex gap-2">
              {['UI', 'TRACKER', 'API', 'OTHER'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                    category === cat 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div>
              <textarea
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title || !description}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold text-xs uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Submit Report
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </AnimatePresence>

      {status === 'error' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-[10px] font-bold mt-3 text-center"
        >
          Failed to send report. Please try again.
        </motion.p>
      )}
    </motion.div>
  );
}
