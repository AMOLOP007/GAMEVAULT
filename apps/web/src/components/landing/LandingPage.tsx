'use client';

import React from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
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
  Monitor,
  Command,
  Cpu,
  Fingerprint
} from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    },
  },
};

const floatVariants = {
  animate: {
    y: [0, -20, 0],
    rotate: [0, 5, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const rotateX = useTransform(scrollY, [0, 1000], [0, 20]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.95]);

  const DOWNLOAD_URL = "https://github.com/AMOLOP007/GAMEVAULT/releases/download/v1.0.2/GameVault-Setup-1.0.2.exe";

  return (
    <div className="bg-[#030308] text-white selection:bg-[#8b5cf6]/50 overflow-x-hidden font-sans">
      {/* ── Fixed Navigation ── */}
      <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#030308]/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <Command className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">GAMEVAULT</span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-12">
            {['Features', 'Intelligence', 'Community', 'Roadmap'].map((item) => (
              <motion.a 
                whileHover={{ y: -2, color: "#fff" }}
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-xs font-black text-slate-500 transition-colors uppercase tracking-[0.2em] no-underline"
              >
                {item}
              </motion.a>
            ))}
          </div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <AnimatedButton 
              onClick={() => window.location.href = DOWNLOAD_URL}
              className="px-6 h-11 text-xs shadow-[0_0_20px_rgba(139,92,246,0.2)] bg-white text-black hover:bg-[#8b5cf6] hover:text-white transition-all"
            >
              Get GameVault
            </AnimatedButton>
          </motion.div>
        </div>
      </nav>

      <main>
        {/* ── Intense Hero Section ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6">
          {/* Background FX */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,#1a1a3a_0%,transparent_70%)] opacity-30" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#8b5cf6]/10 blur-[150px] rounded-full"
            />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 text-center max-w-5xl"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#c084fc] text-[9px] font-black uppercase tracking-[0.4em] mb-12"
            >
              <Sparkles className="w-3 h-3" /> Redefining the Library
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.8] mb-10 perspective-1000"
            >
              UNIFY <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#3b82f6] italic">
                EVERYTHING.
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto mb-16 leading-relaxed"
            >
              The ultimate command center for modern gamers. One vault for all your achievements, playtime, and collections. 
            </p>

            <motion.div variants={itemVariants} className="flex justify-center">
              <AnimatedButton 
                size="lg" 
                onClick={() => window.location.href = DOWNLOAD_URL}
                className="px-16 h-20 text-2xl font-black uppercase tracking-tighter shadow-[0_30px_100px_rgba(139,92,246,0.5)] group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-4">
                  <Download className="w-7 h-7" /> Launch Setup v1.0.2
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] opacity-0 group-hover:opacity-100 transition-opacity" />
              </AnimatedButton>
            </motion.div>
          </motion.div>

          {/* Floating HUD Elements (No App Previews) */}
          <div className="absolute inset-0 pointer-events-none hidden lg:block">
            <motion.div 
              variants={floatVariants}
              animate="animate"
              className="absolute top-[20%] left-[10%] p-8 glass-panel border-[#8b5cf6]/30 bg-[#0c0c1d]/60 backdrop-blur-xl rounded-[2rem]"
            >
              <Activity className="w-10 h-10 text-[#34d399] mb-4" />
              <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["0%", "80%"] }} transition={{ duration: 2 }} className="h-full bg-[#34d399]" />
              </div>
            </motion.div>

            <motion.div 
              variants={floatVariants}
              animate="animate"
              className="absolute bottom-[20%] right-[10%] p-8 glass-panel border-[#d946ef]/30 bg-[#0c0c1d]/60 backdrop-blur-xl rounded-[2rem]"
            >
              <Trophy className="w-10 h-10 text-[#fbbf24] mb-4" />
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-lg bg-white/10" />)}
              </div>
            </motion.div>

            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-[60%] right-[15%] w-32 h-32 border-2 border-dashed border-[#8b5cf6]/20 rounded-full flex items-center justify-center"
            >
              <Cpu className="w-8 h-8 text-[#8b5cf6]/40" />
            </motion.div>
          </div>
        </section>

        {/* ── Snappy Features Grid ── */}
        <section id="features" className="py-40 relative px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-24"
            >
              <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none">
                BUILT FOR <br />
                <span className="text-[#8b5cf6]">SPEED.</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Hyper-Tracking",
                  desc: "Zero manual logging. Our low-level driver monitors playtime with surgical precision and zero lag.",
                  color: "#8b5cf6"
                },
                {
                  icon: Shield,
                  title: "Local Isolation",
                  desc: "Your data stays in your vault. Local-first architecture ensures speed and total privacy.",
                  color: "#3b82f6"
                },
                {
                  icon: Fingerprint,
                  title: "System Discovery",
                  desc: "Automatic system scan detects installed games across every drive and launcher instantly.",
                  color: "#d946ef"
                },
                {
                  icon: Globe,
                  title: "Unified Cloud",
                  desc: "Sync your library across devices seamlessly while maintaining local performance.",
                  color: "#34d399"
                },
                {
                  icon: BarChart3,
                  title: "Data Alchemy",
                  desc: "Transform your raw gaming hours into beautiful interactive analytics and heatmaps.",
                  color: "#fbbf24"
                },
                {
                  icon: Rocket,
                  title: "Ultra Minimal",
                  desc: "Clean, distraction-free interface designed for performance and aesthetic excellence.",
                  color: "#f87171"
                }
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/40 transition-all cursor-default group overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] -translate-y-1/2 translate-x-1/2 rounded-full blur-3xl group-hover:bg-[#8b5cf6]/10 transition-all" />
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 group-hover:border-[#8b5cf6]/20 group-hover:bg-[#8b5cf6]/5 transition-all">
                    <f.icon className="w-8 h-8" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-2xl font-black mb-4 uppercase tracking-tight italic">{f.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Intelligence / System Section ── */}
        <section id="intelligence" className="py-40 relative bg-[#0c0c1d]/40 border-y border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-32 items-center">
            <div className="relative">
              <motion.div 
                initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
                whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="aspect-square glass-panel rounded-[3rem] border-[#8b5cf6]/20 flex flex-col items-center justify-center gap-8 relative overflow-hidden"
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/10 to-transparent" />
                 <div className="w-32 h-32 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                    <Cpu className="w-16 h-16 text-[#8b5cf6]" />
                 </div>
                 <div className="space-y-3 w-2/3">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                       <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent" />
                    </div>
                    <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                    <div className="h-2 w-1/2 bg-white/5 rounded-full" />
                 </div>
              </motion.div>
            </div>

            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-8 uppercase leading-tight">
                SYNAPTIC <br />
                <span className="text-[#8b5cf6]">INTELLIGENCE.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium mb-12 leading-relaxed">
                GameVault scans your system architecture, identifies game binaries, and hydrates your library with high-resolution assets instantly.
              </p>
              <div className="space-y-8">
                {[
                  { t: "Automated Metadata", d: "Deep integration with global game databases." },
                  { t: "Low-Level Tracking", d: "Hooks into system calls for zero performance impact." },
                  { t: "Universal Discovery", d: "Supports Steam, Epic, GOG, and local executables." }
                ].map((item, i) => (
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex gap-4 items-start"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] mt-2" />
                    <div>
                      <p className="font-black text-white text-lg uppercase tracking-tight italic">{item.t}</p>
                      <p className="text-slate-500 font-medium">{item.d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Community / Status ── */}
        <section id="community" className="py-40 relative px-6">
           <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-20 leading-[0.85]">
                THE <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-[#3b82f6]">GLOBAL</span> <br /> VAULT.
              </h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                   { l: "Activity Feed", i: Globe, c: "#3b82f6" },
                   { l: "Hall of Fame", i: Trophy, c: "#fbbf24" },
                   { l: "Global Stats", i: Activity, c: "#34d399" },
                   { l: "Community Hub", i: Users, c: "#8b5cf6" }
                 ].map((item, i) => (
                   <motion.div 
                     key={i}
                     whileHover={{ scale: 1.05, borderColor: item.c + "40" }}
                     className="glass-panel p-12 rounded-[2rem] border-white/5 flex flex-col items-center gap-6"
                   >
                      <item.i className="w-12 h-12" style={{ color: item.c }} />
                      <span className="text-xs font-black uppercase tracking-[0.3em]">{item.l}</span>
                   </motion.div>
                 ))}
              </div>
           </div>
        </section>

        {/* ── Centerpiece CTA ── */}
        <section className="py-60 relative px-6 overflow-hidden">
           {/* Centerpiece FX */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#8b5cf6]/10 blur-[180px] rounded-full pointer-events-none" />
           
           <div className="max-w-4xl mx-auto relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="space-y-12"
              >
                 <h2 className="text-7xl md:text-[8rem] font-black tracking-tighter uppercase leading-[0.8] mb-12 italic">
                    START YOUR <br /> <span className="text-[#8b5cf6]">VAULT.</span>
                 </h2>
                 
                 <div className="flex flex-col items-center gap-8">
                    <AnimatedButton 
                      size="lg" 
                      onClick={() => window.location.href = DOWNLOAD_URL}
                      className="px-20 h-24 text-3xl font-black uppercase tracking-tighter shadow-[0_40px_120px_rgba(139,92,246,0.6)] group relative overflow-hidden rounded-3xl"
                    >
                      <span className="relative z-10 flex items-center gap-6">
                        Download for Windows <Download className="w-8 h-8" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </AnimatedButton>
                    
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
                      Version 1.0.2 Stable • Free Forever • Open Source
                    </p>
                 </div>
              </motion.div>
           </div>

           {/* Floating Particles */}
           {[...Array(20)].map((_, i) => (
             <motion.div
               key={i}
               animate={{ 
                 y: [0, -100, 0],
                 x: [0, (Math.random() - 0.5) * 100, 0],
                 opacity: [0, 0.5, 0]
               }}
               transition={{ 
                 duration: 3 + Math.random() * 4, 
                 repeat: Infinity,
                 delay: Math.random() * 5
               }}
               className="absolute w-1 h-1 bg-[#8b5cf6] rounded-full blur-[1px] pointer-events-none"
               style={{ 
                 top: `${Math.random() * 100}%`, 
                 left: `${Math.random() * 100}%` 
               }}
             />
           ))}
        </section>
      </main>

      {/* ── Minimal Footer ── */}
      <footer className="py-20 border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4">
            <Command className="w-8 h-8 text-[#8b5cf6]" />
            <span className="text-2xl font-black tracking-tighter uppercase italic">GAMEVAULT</span>
          </div>
          
          <div className="flex gap-12">
            {['Twitter', 'Discord', 'Github', 'Privacy'].map(link => (
              <a 
                key={link} 
                href="#" 
                className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors no-underline"
              >
                {link}
              </a>
            ))}
          </div>

          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            © 2026 GAMEVAULT SYSTEM • OPERATIONAL
          </p>
        </div>
      </footer>
    </div>
  );
}
