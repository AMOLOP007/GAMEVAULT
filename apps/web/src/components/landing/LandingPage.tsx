'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Download, 
  Gamepad2, 
  Zap, 
  Shield, 
  Trophy, 
  ChevronRight, 
  Clock, 
  Search, 
  Users,
  Activity,
  Globe,
  Sparkles,
  BarChart3,
  Rocket,
  ArrowRight,
  Monitor
} from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Point to the latest stable release
  const DOWNLOAD_URL = "https://github.com/AMOLOP007/GAMEVAULT/releases/download/v1.0.2/GameVault-Setup-1.0.2.exe";

  return (
    <div className="bg-[#030308] text-white selection:bg-[#8b5cf6]/30 overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#030308]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">GAMEVAULT</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {['Features', 'Intelligence', 'Community', 'Roadmap'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-sm font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest no-underline"
              >
                {item}
              </a>
            ))}
          </div>

          <AnimatedButton 
            onClick={() => window.location.href = DOWNLOAD_URL}
            className="hidden md:flex shadow-[0_0_30px_rgba(139,92,246,0.2)]"
          >
            Download v1.0.2
          </AnimatedButton>
        </div>
      </nav>

      <main>
        {/* ── Hero Section ── */}
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#8b5cf6]/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full animate-pulse delay-700" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#c084fc] text-[10px] font-black uppercase tracking-[0.3em] mb-8">
                <Sparkles className="w-3 h-3" /> System Stable v1.0.2
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                COMMAND YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] via-[#8b5cf6] to-[#7c3aed]">
                  LIBRARY.
                </span>
              </h1>
              <p className="text-xl text-slate-400 font-medium max-w-lg mb-10 leading-relaxed">
                The ultimate command center for modern gamers. Track, analyze, and master your collection across all platforms with zero manual entry.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <AnimatedButton 
                  size="lg" 
                  onClick={() => window.location.href = DOWNLOAD_URL}
                  className="px-10 h-16 text-lg shadow-[0_20px_50px_rgba(139,92,246,0.3)]"
                >
                  <Download className="w-5 h-5" /> Download Setup
                </AnimatedButton>
                <AnimatedButton 
                  variant="ghost" 
                  size="lg" 
                  onClick={() => window.location.href = "/dashboard"}
                  className="px-10 h-16 text-lg border-white/10 hover:bg-white/5"
                >
                  Open Dashboard
                </AnimatedButton>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 glass-panel p-4 rounded-[2.5rem] border-[#8b5cf6]/20 bg-[#0c0c1d]/40 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                <img 
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000" 
                  className="w-full h-auto rounded-[2rem] shadow-2xl relative z-10 opacity-60"
                  alt="GameVault UI Preview"
                />
                <motion.div 
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-10 -right-10 glass-panel p-6 rounded-3xl border-[#8b5cf6]/30 bg-[#1a1a3a]/80 shadow-2xl z-20"
                >
                  <Activity className="w-8 h-8 text-[#34d399] mb-2" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Live Feed</p>
                  <p className="text-xl font-black">4h Session</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="py-40 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">Master Your Vault</h2>
              <p className="text-xl text-slate-400 font-medium">Every tool you need to organize your digital legacy, built with performance in mind.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  icon: Zap,
                  title: "Instant Detection",
                  desc: "Our low-level driver detects game processes instantly, logging your playtime with zero frame-rate impact.",
                  color: "#8b5cf6"
                },
                {
                  icon: Shield,
                  title: "Encrypted Data",
                  desc: "Your personal library and session data are stored with local-first encryption. Your privacy is paramount.",
                  color: "#60a5fa"
                },
                {
                  icon: Trophy,
                  title: "Unified Trophies",
                  desc: "Connect your Steam and Epic accounts to see all your accomplishments in one glorious gallery.",
                  color: "#fbbf24"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel p-10 group hover:border-[#8b5cf6]/40 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 group-hover:bg-[#8b5cf6]/10 transition-all">
                    <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-2xl font-black mb-4 uppercase italic tracking-tight">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Intelligence Section ── */}
        <section id="intelligence" className="py-40 relative bg-white/[0.01] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
            <div>
               <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase leading-none">
                Deep <br />
                <span className="text-[#8b5cf6]">Intelligence.</span>
               </h2>
               <p className="text-xl text-slate-400 font-medium mb-12 leading-relaxed">
                GameVault doesn't just list your games. It analyzes your playstyles, provides deep metadata hydration, and discovers hidden titles on your system automatically.
               </p>
               <div className="space-y-6">
                  {[
                    { icon: BarChart3, t: "Automated Metadata", d: "Cover art, ratings, and release info synced instantly." },
                    { icon: Monitor, t: "System-Wide Scan", d: "Scan all drives for installed games across any launcher." },
                    { icon: Clock, t: "Precision Tracking", d: "Frame-perfect playtime logging with zero CPU overhead." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                       <div className="p-2 rounded-lg bg-[#8b5cf6]/10 h-fit">
                          <item.icon className="w-5 h-5 text-[#c084fc]" />
                       </div>
                       <div>
                          <p className="font-black text-white text-lg">{item.t}</p>
                          <p className="text-slate-500 text-sm">{item.d}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="relative">
               <div className="absolute -inset-10 bg-[#8b5cf6]/5 blur-[100px] rounded-full" />
               <div className="glass-panel p-8 rounded-3xl relative z-10 border-[#8b5cf6]/10">
                  <div className="flex items-center justify-between mb-8">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Analytics Pulse</p>
                     <div className="flex gap-1">
                        {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#8b5cf6]" />)}
                     </div>
                  </div>
                  <div className="space-y-6">
                     {[80, 45, 95, 60].map((w, i) => (
                        <div key={i} className="space-y-2">
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${w}%` }}
                                transition={{ duration: 1.5, delay: i * 0.1 }}
                                className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#c084fc]"
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* ── Community Section ── */}
        <section id="community" className="py-40 relative">
           <div className="max-w-7xl mx-auto px-6 text-center">
              <h2 className="text-5xl font-black tracking-tighter mb-6 uppercase">Unified Community</h2>
              <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-20">See what the world is playing. Join global challenges and climb the rankings.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {[
                   { label: "Activity Feed", icon: Globe },
                   { label: "Friend List", icon: Users },
                   { label: "Challenges", icon: Trophy },
                   { label: "Live Chat", icon: Zap }
                 ].map((item, i) => (
                   <div key={i} className="glass-panel p-10 flex flex-col items-center gap-4 hover:border-[#8b5cf6]/40 transition-all group">
                      <item.icon className="w-10 h-10 text-[#8b5cf6] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ── Roadmap Section ── */}
        <section id="roadmap" className="py-40 relative bg-[#8b5cf6]/5">
           <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row gap-20 items-center">
                 <div className="flex-1">
                    <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase">The Roadmap</h2>
                    <div className="space-y-8">
                       {[
                         { q: "Q2 2026", t: "Steam Achievement Cloud", s: "Developing" },
                         { q: "Q3 2026", t: "Mobile Sync Companion", s: "Planned" },
                         { q: "Q4 2026", t: "AI Playstyle Analysis", s: "Research" }
                       ].map((item, i) => (
                         <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-[#0c0c1d]/60 border border-white/5">
                            <div className="flex items-center gap-4">
                               <span className="text-[#8b5cf6] font-black text-lg">{item.q}</span>
                               <span className="font-bold text-white">{item.t}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#c084fc]">{item.s}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="w-64 h-64 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex flex-col items-center justify-center p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.3)]">
                    <Rocket className="w-12 h-12 mb-4 animate-bounce" />
                    <p className="text-sm font-black uppercase tracking-widest">Next-Gen Release Coming 2026</p>
                 </div>
              </div>
           </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-40 px-6 text-center">
           <div className="max-w-4xl mx-auto glass-panel p-20 rounded-[3rem] border-[#8b5cf6]/20 bg-gradient-to-b from-[#8b5cf6]/5 to-transparent">
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter uppercase leading-none">
                Start Your <br/> <span className="text-[#8b5cf6]">Vault Today.</span>
              </h2>
              <AnimatedButton 
                size="lg" 
                onClick={() => window.location.href = DOWNLOAD_URL}
                className="px-12 h-20 text-2xl shadow-[0_30px_60px_rgba(139,92,246,0.3)]"
              >
                Download v1.0.2 <ArrowRight className="ml-3 w-8 h-8" />
              </AnimatedButton>
           </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-[#8b5cf6]" />
            <span className="text-2xl font-black tracking-tighter">GAMEVAULT</span>
          </div>
          <p className="text-slate-500 font-bold text-sm">© 2026 GameVault. Master your digital legacy.</p>
          <div className="flex gap-8">
            {['Twitter', 'Discord', 'Github'].map(s => (
              <a key={s} href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-black uppercase tracking-widest no-underline">{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
