'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import { 
  ArrowRight, Check, Globe, Download, Zap, Shield, Fingerprint, 
  RefreshCcw, Command, Cpu, Lock, Activity, Trophy
} from 'lucide-react';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';

const DOWNLOAD_URL = "https://github.com/AMOLOP007/GAMEVAULT/releases/download/v1.5.0/GameVault-Setup-1.5.0.exe";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Parallax transforms
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const featuresY = useTransform(smoothProgress, [0.1, 0.4], [100, 0]);
  const updatesY = useTransform(smoothProgress, [0.4, 0.7], [100, 0]);

  // Email CTA State
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  
  const fullPlaceholder = submitted ? 'You Will Receive Notifications By Email' : 'Subscribe for GameVault Updates';

  useEffect(() => {
    if (showEmailInput || submitted) {
      let currentIndex = 0;
      setPlaceholder('');
      const interval = setInterval(() => {
        if (currentIndex <= fullPlaceholder.length) {
          setPlaceholder(fullPlaceholder.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          if (submitted) {
            setTimeout(() => {
              setSubmitted(false);
              setShowEmailInput(false);
              setEmailValue('');
            }, 4000);
          }
        }
      }, 60);
      return () => clearInterval(interval);
    }
  }, [showEmailInput, submitted, fullPlaceholder]);

  return (
    <main ref={containerRef} className="relative bg-black h-screen w-screen flex flex-col overflow-y-auto overflow-x-hidden selection:bg-[#8b5cf6]/50 selection:text-white font-sans">
      
      {/* ── Navbar ── */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 z-50 px-6 py-6 w-full pointer-events-none"
      >
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between max-w-5xl mx-auto pointer-events-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Command className="w-5 h-5 text-[#8b5cf6]" />
              <span className="text-white font-semibold text-sm tracking-widest uppercase">GameVault</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-white/70 text-xs font-medium uppercase tracking-widest">
              <a href="#features" className="hover:text-white transition-colors duration-300">Features</a>
              <a href="#updates" className="hover:text-white transition-colors duration-300">Updates</a>
              <a href="/privacy" className="hover:text-white transition-colors duration-300">Privacy</a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://discord.gg/BY7CVMRCVc" target="_blank" rel="noreferrer" className="hidden md:block text-white/70 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
              Discord
            </a>
            <button 
              onClick={() => window.location.href = DOWNLOAD_URL}
              className="glass-pill px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#8b5cf6]/20 transition-all cursor-pointer"
            >
              Download
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── 100vh Hero Section ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden shrink-0">
        <BackgroundVideo src="https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8" />
        
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center max-w-5xl mx-auto flex flex-col items-center justify-center w-full gap-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass border border-[#8b5cf6]/20 text-[#c084fc] text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase"
          >
            <Trophy className="w-3 h-3" /> ULTIMATE GAME TRACKER v1.5.0
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'Instrument Serif', serif" }}
            className="text-5xl md:text-[72px] font-medium tracking-[-0.01em] leading-[1.1] bg-gradient-to-b from-white via-white/95 to-[#8b5cf6]/70 bg-clip-text text-transparent max-w-4xl"
          >
            One vault for all your achievements, <br className="hidden md:block" /> playtime, and collections.
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="min-h-[50px] mt-4 w-full flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* Primary Action */}
            <button 
              onClick={() => window.location.href = DOWNLOAD_URL}
              className="px-10 py-3 text-[14px] font-semibold tracking-wide bg-[#8b5cf6] text-white rounded-full hover:bg-[#7c3aed] shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transition-all duration-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Setup.exe
            </button>

            {/* Secondary Action (Email CTA) */}
            <div className="relative w-full max-w-[320px] flex justify-center">
              <AnimatePresence mode="wait">
                {!showEmailInput ? (
                  <motion.button
                    key="btn"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setShowEmailInput(true)}
                    className="px-8 py-3 text-[14px] font-medium border border-white/10 rounded-full hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 transition-all duration-300 text-white/90 backdrop-blur-sm cursor-pointer w-full sm:w-auto"
                  >
                    Get update alerts
                  </motion.button>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                    className="flex items-center gap-2 pl-5 pr-1.5 py-1.5 text-[14px] font-medium border border-[#8b5cf6]/40 rounded-full liquid-glass w-full focus-within:border-[#8b5cf6] transition-colors duration-300"
                  >
                    <input 
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      placeholder={placeholder}
                      disabled={submitted}
                      className="bg-transparent border-none outline-none text-white placeholder-white/45 flex-1 min-w-0"
                      autoFocus
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={submitted}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-gray-200 transition-colors shrink-0"
                    >
                      {submitted ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-white/50 text-[12px] font-medium tracking-wide mt-8"
          >
            Windows 10/11 • Free & Open Source
          </motion.p>
        </motion.div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-[#8b5cf6]/50 to-transparent" />
        </motion.div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="relative py-40 px-6 z-10 bg-[#030308]">
        <motion.div style={{ y: featuresY }} className="max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-5xl md:text-7xl font-medium tracking-tight mb-6">
              Engineered for absolute <span className="text-[#8b5cf6] italic">precision.</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">Everything you need to track your library flawlessly, without the bloat.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Fingerprint, t: "Forensic Sync", d: "Reads raw local files for 99.9% playtime accuracy without relying on fragile APIs." },
              { icon: Shield, t: "Data Integrity", d: "Advanced 4-layer anti-cheat heuristics protect your achievement validity." },
              { icon: RefreshCcw, t: "Auto-Updater", d: "Built-in seamless update engine keeps GameVault on the bleeding edge automatically." },
              { icon: Activity, t: "Instant Pulse", d: "Zero-lag tab switching and liquid-smooth transitions powered by native optimizations." },
              { icon: Cpu, t: "Synaptic Tracker", d: "Intelligent background polling minimizes CPU usage while you game." },
              { icon: Lock, t: "Local Sovereignty", d: "Your data stays on your machine. We only sync what you explicitly allow." }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="liquid-glass p-8 rounded-3xl group hover:-translate-y-2 transition-transform duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-[#8b5cf6]/40 transition-colors">
                  <f.icon className="w-6 h-6 text-[#8b5cf6]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.t}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Changelog / Updates Section ── */}
      <section id="updates" className="relative py-40 px-6 z-10 bg-gradient-to-b from-[#030308] to-[#0c0c1d]">
        <motion.div style={{ y: updatesY }} className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 border-b border-white/10 pb-8">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-5xl md:text-6xl font-medium tracking-tight">
                Release <span className="text-[#c084fc] italic">Intel.</span>
              </h2>
            </div>
            <div className="text-right mt-6 md:mt-0">
              <span className="glass-pill px-4 py-1.5 text-xs font-bold text-[#8b5cf6] uppercase tracking-widest">Version 1.5.0 (Latest)</span>
            </div>
          </div>

          <div className="space-y-12">
            {[
              { 
                tag: "Security", 
                title: "Hardened Anti-Cheat & Security", 
                desc: "Deployed a new 4-layer fraud detection system for achievements (temporal entropy, proportional clustering). Machine-derived encryption keys now protect local stores." 
              },
              { 
                tag: "Performance", 
                title: "Adaptive Tracker Polling", 
                desc: "Drastically reduced CPU usage by pausing heavy scanning when no games are active. Overhauled the sync service to be fully event-driven." 
              },
              { 
                tag: "System", 
                title: "Expanded Trophy Compatibility", 
                desc: "Added deep-scan fallback and UE5 support (WindowsNoEditor/SaveGames). Offline trophies now merge gracefully across multiple sources." 
              }
            ].map((update, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex flex-col md:flex-row gap-6 md:gap-12 group"
              >
                <div className="md:w-32 shrink-0 pt-1">
                  <span className="text-xs font-black uppercase tracking-widest text-[#8b5cf6]/70 group-hover:text-[#8b5cf6] transition-colors">{update.tag}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">{update.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm max-w-2xl">{update.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-12 px-6 border-t border-white/10 bg-[#030308] z-20 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Command className="w-6 h-6 text-[#8b5cf6]" />
            <span className="text-white font-semibold text-sm tracking-widest uppercase">GameVault</span>
          </div>
          
          <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            <a href="https://www.reddit.com/user/Witty-Engine-7304/comments/1t73t10/gamevault/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Reddit</a>
            <a href="https://discord.gg/BY7CVMRCVc" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Discord</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
          
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            © {new Date().getFullYear()} GameVault System
          </div>
        </div>
      </footer>
    </main>
  );
}
