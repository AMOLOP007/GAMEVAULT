'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Download, Gamepad2, Layers, Zap, Shield, 
  ChevronRight, Sparkles, Star, Trophy, Users, 
  Activity, Play, MousePointer2 
} from 'lucide-react';

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030308] text-white overflow-x-hidden selection:bg-[#8b5cf6]/30 font-inter">
      {/* ── Dynamic Background ── */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-[#8b5cf6]/10 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#3b82f6]/5 rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none">
          <div className="h-full w-full bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>
      </div>

      {/* ── Floating Nav ── */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-[#030308]/40 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#8b5cf6] to-[#d946ef] flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            >
              <Gamepad2 className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter uppercase italic">GameVault</span>
              <span className="text-[10px] font-bold text-[#8b5cf6] tracking-[0.3em] uppercase">Pro Hub</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['Features', 'Intelligence', 'Community', 'Roadmap'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors no-underline">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a href="/login" className="hidden sm:block text-sm font-bold text-white no-underline hover:text-[#c084fc] transition-colors">
              Sign In
            </a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="https://github.com/AMOLOP007/GAMEVAULT/releases/latest/download/GameVault-Setup-1.0.1.exe"
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-sm transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] no-underline"
            >
              Get Started <Download className="w-4 h-4" />
            </motion.a>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10">
        {/* ── Hero Section ── */}
        <section className="pt-40 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-bold text-slate-400 mb-8">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
                Next-Gen Tracker Now Live
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-[calc(-0.04em)] leading-[0.95] mb-8">
                COMMAND YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#f472b6] animate-gradient-x">
                  GAMING EMPIRE.
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                One vault for all your achievements, playtime, and collections. 
                Seamlessly integrated with Steam, Epic, and your local library.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <motion.a
                  href="https://github.com/AMOLOP007/GAMEVAULT/releases/latest/download/GameVault-Setup-1.0.1.exe"
                  whileHover={{ scale: 1.02 }}
                  className="group relative flex items-center gap-3 bg-[#8b5cf6] text-white px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-[0_20px_50px_rgba(139,92,246,0.3)] no-underline"
                >
                  <Download className="w-6 h-6" /> 
                  Download for Windows
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
                <a href="#features" className="flex items-center gap-2 text-white font-bold text-lg hover:gap-4 transition-all no-underline">
                  Explore Features <ChevronRight className="w-6 h-6 text-[#8b5cf6]" />
                </a>
              </div>

              {/* ── Hero Mockup ── */}
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-24 relative max-w-5xl mx-auto"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] rounded-[32px] blur-2xl opacity-20" />
                <div className="relative rounded-[28px] border border-white/10 bg-[#0c0c1d]/80 backdrop-blur-2xl overflow-hidden shadow-2xl aspect-video">
                  {/* Mock UI */}
                  <div className="p-8 h-full flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5" />
                        <div className="w-40 h-12 rounded-xl bg-white/5" />
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-white/5" />)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 flex-1">
                      <div className="col-span-2 rounded-2xl bg-white/5 p-6 relative overflow-hidden">
                         <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#8b5cf6]/20 to-transparent" />
                         <div className="w-1/2 h-8 bg-white/10 rounded-lg mb-4" />
                         <div className="w-full h-32 bg-white/5 rounded-xl" />
                      </div>
                      <div className="rounded-2xl bg-white/5 p-6 flex flex-col gap-4">
                         {[1,2,3,4].map(i => (
                           <div key={i} className="flex gap-3 items-center">
                             <div className="w-8 h-8 rounded-lg bg-white/10" />
                             <div className="flex-1 h-4 bg-white/5 rounded" />
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-12 -right-12 p-6 rounded-3xl glass-panel shadow-2xl border border-white/10 z-20"
                >
                  <Trophy className="w-10 h-10 text-yellow-400 mb-2" />
                  <p className="text-xs font-black uppercase text-slate-500">New Achievement</p>
                  <p className="text-lg font-black italic">ELDRITCH SLAYER</p>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -bottom-8 -left-12 p-6 rounded-3xl glass-panel shadow-2xl border border-white/10 z-20"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#34d399]/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-[#34d399]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase">Live Tracking</p>
                      <p className="text-xl font-black">4h 22m SESSION</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-5xl font-black tracking-tight mb-8">
                  ENGINEERED FOR <br />
                  <span className="text-[#8b5cf6]">PERFECTION.</span>
                </h2>
                <div className="space-y-10">
                  {[
                    { icon: Zap, title: 'Hyper-Fast Discovery', desc: 'Auto-scan thousands of games in seconds. Support for Steam, Epic, GOG, and custom launchers.' },
                    { icon: Shield, title: 'Encrypted Persistence', desc: 'Your play history and collection are synced across devices with bank-grade encryption.' },
                    { icon: MousePointer2, title: 'Zero Lag Tracking', desc: 'Minimal background process footprint. We track your time without stealing your FPS.' }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2 }}
                      className="flex gap-6"
                    >
                      <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center border border-[#8b5cf6]/20">
                        <item.icon className="w-7 h-7 text-[#c084fc]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-2">{item.title}</h3>
                        <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -10 }}
                    className="aspect-square rounded-[32px] bg-white/5 border border-white/10 p-8 flex flex-col justify-end group transition-colors hover:bg-[#8b5cf6]/10"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 mb-4 group-hover:bg-white/20 transition-colors" />
                    <div className="h-4 w-full bg-white/10 rounded mb-2" />
                    <div className="h-4 w-2/3 bg-white/5 rounded" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Statistics / Numbers ── */}
        <section className="py-20 border-y border-white/5 bg-white/[0.02]">
           <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                 {[
                   { label: 'Active Players', value: '50K+' },
                   { label: 'Games Tracked', value: '2M+' },
                   { label: 'Cloud Synced', value: '99.9%' },
                   { label: 'Avg FPS Impact', value: '<0.01%' },
                 ].map((stat, i) => (
                   <div key={i}>
                      <p className="text-4xl md:text-5xl font-black text-white mb-2">{stat.value}</p>
                      <p className="text-xs font-bold text-[#8b5cf6] uppercase tracking-[0.2em]">{stat.label}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ── Call To Action ── */}
        <section className="py-40 px-6 overflow-hidden">
           <div className="max-w-5xl mx-auto relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#8b5cf6]/20 blur-[150px] -z-10" />
              <div className="glass-panel p-16 md:p-24 rounded-[48px] text-center border border-white/10">
                 <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight">
                    READY TO UPGRADE <br /> YOUR VAULT?
                 </h2>
                 <p className="text-lg text-slate-400 mb-12 max-w-xl mx-auto">
                    Join thousands of players who have unified their collection.
                    The ultimate gaming companion is just one click away.
                 </p>
                 <motion.a
                    whileHover={{ scale: 1.05 }}
                    href="https://github.com/AMOLOP007/GAMEVAULT/releases/latest/download/GameVault-Setup-1.0.1.exe"
                    className="inline-flex items-center gap-3 bg-white text-black px-12 py-6 rounded-[24px] font-black text-2xl transition-all hover:shadow-[0_30px_60px_rgba(255,255,255,0.1)] no-underline"
                 >
                    Download v1.0.1 <ChevronRight className="w-6 h-6" />
                 </motion.a>
              </div>
           </div>
        </section>
      </main>

      <footer className="py-20 px-6 border-t border-white/5">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="md:col-span-2">
               <div className="flex items-center gap-3 mb-6">
                  <Gamepad2 className="w-8 h-8 text-[#8b5cf6]" />
                  <span className="text-2xl font-black italic">GAMEVAULT</span>
               </div>
               <p className="text-slate-400 max-w-sm leading-relaxed">
                  The mission is simple: unify the gaming experience. No more fragmented libraries. No more lost achievements. Just you and your games.
               </p>
            </div>
            <div>
               <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Platform</h4>
               <ul className="space-y-4 text-slate-400 font-bold text-sm list-none p-0">
                  <li><a href="#" className="hover:text-white transition-colors no-underline">Download</a></li>
                  <li><a href="#" className="hover:text-white transition-colors no-underline">Security</a></li>
                  <li><a href="#" className="hover:text-white transition-colors no-underline">Source Code</a></li>
               </ul>
            </div>
            <div>
               <h4 className="font-black text-white mb-6 uppercase tracking-widest text-xs">Support</h4>
               <ul className="space-y-4 text-slate-400 font-bold text-sm list-none p-0">
                  <li><a href="#" className="hover:text-white transition-colors no-underline">Discord</a></li>
                  <li><a href="#" className="hover:text-white transition-colors no-underline">API Docs</a></li>
                  <li><a href="#" className="hover:text-white transition-colors no-underline">Bug Report</a></li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex justify-between items-center text-xs font-bold text-slate-600">
            <p>© 2026 GAMEVAULT. BUILT WITH PASSION BY GAMERS.</p>
            <div className="flex gap-8">
               <a href="#" className="hover:text-white transition-colors no-underline">PRIVACY</a>
               <a href="#" className="hover:text-white transition-colors no-underline">TERMS</a>
            </div>
         </div>
      </footer>
    </div>
  );
}

