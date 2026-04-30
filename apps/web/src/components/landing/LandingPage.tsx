'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Download, Gamepad2, Layers, Zap, Shield, ChevronRight, Sparkles, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-hidden selection:bg-[#8b5cf6]/30">
      {/* ── Background ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-[#8b5cf6]/8 rounded-full blur-[180px] mix-blend-screen opacity-60" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-[#a855f7]/6 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6d28d9]/5 rounded-full blur-[120px] mix-blend-screen opacity-40" />
        <div className="hex-grid-bg opacity-[0.03]" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-50 border-b border-[#8b5cf6]/8 bg-[#030308]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.35)]">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight uppercase">GameVault</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-[#64748b]">
            <a href="#features" className="hover:text-[#c084fc] transition-colors">Features</a>
            <a href="#about" className="hover:text-[#c084fc] transition-colors">About</a>
          </div>
          <a
            href="https://github.com/AMOLOP007/GAMEVAULT/releases/latest/download/GameVault-Setup-1.0.0.exe"
            className="flex items-center gap-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="relative z-10">
        <section className="relative pt-28 pb-16 lg:pt-40 lg:pb-28 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto space-y-7"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/6 text-[#c084fc] text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> v1.0 Desktop App Now Available
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.08]">
                Your gaming universe, <br className="hidden md:block" />
                <span className="gradient-text-vivid">unified in one vault.</span>
              </h1>

              <p className="text-lg text-[#64748b] max-w-2xl mx-auto leading-relaxed">
                GameVault is the ultimate desktop command center. Track playtime across all platforms, sync your library, and manage your backlog like a pro.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <a
                  href="https://github.com/AMOLOP007/GAMEVAULT/releases/latest/download/GameVault-Setup-1.0.0.exe"
                  className="flex items-center gap-3 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.35)] transition-all hover:-translate-y-1 w-full sm:w-auto justify-center"
                >
                  <Download className="w-5 h-5" /> Download for Windows
                </a>
                <a
                  href="#features"
                  className="flex items-center gap-2 bg-[#8b5cf6]/6 border border-[#8b5cf6]/15 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/25 transition-all w-full sm:w-auto justify-center"
                >
                  See Features <ChevronRight className="w-5 h-5" />
                </a>
              </div>
              <p className="text-xs text-[#334155] font-bold uppercase tracking-wider pt-2">Windows 10/11 (64-bit)</p>
            </motion.div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-20 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Built for gamers, by gamers.</h2>
              <p className="text-[#64748b] max-w-2xl mx-auto text-base">Everything you need to organize your collection with zero friction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  icon: Layers,
                  title: 'Universal Library',
                  desc: 'Steam, Epic, Xbox, PlayStation, and even retro emulators. All your games in one beautiful interface.',
                  color: '#c084fc',
                },
                {
                  icon: Zap,
                  title: 'Zero-Overhead Tracking',
                  desc: 'The desktop agent runs silently in the background using minimal resources to track your playtime automatically.',
                  color: '#8b5cf6',
                },
                {
                  icon: Shield,
                  title: 'Secure Cloud Sync',
                  desc: 'Your data is encrypted and backed up to the cloud. Never lose your collections or play history again.',
                  color: '#a855f7',
                }
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#0c0c1d]/60 border border-[#8b5cf6]/10 p-7 rounded-2xl hover:bg-[#8b5cf6]/04 hover:border-[#8b5cf6]/20 transition-all relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#8b5cf6]/6 to-transparent blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 relative z-10 border"
                    style={{ backgroundColor: `${feat.color}12`, borderColor: `${feat.color}20`, color: feat.color }}
                  >
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 relative z-10 text-white">{feat.title}</h3>
                  <p className="text-[#64748b] text-sm leading-relaxed relative z-10">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#8b5cf6]/08 bg-[#030308]/80 py-10 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-5 h-5 text-[#8b5cf6]" />
            <span className="font-black uppercase tracking-widest text-[#475569] text-sm">GameVault © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-[#334155]">
            <a href="#" className="hover:text-[#c084fc] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#c084fc] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#c084fc] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
