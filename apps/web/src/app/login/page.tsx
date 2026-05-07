'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

const PSLogoSVG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M11.64 5.54V18.5L8.5 17.5V5.54h3.14m5.24 6.32c0 2.22-2.14 4-4.78 4h-.46v-2.32h.46c1.3 0 2.36-1 2.36-2.26 0-1.24-1.06-2.26-2.36-2.26h-.46V6.7h.46c2.64 0 4.78 1.8 4.78 4.02m-5.24 7.6l4.62 1.48c1.66-.46 2.88-1.68 3.12-3.14l-2.42-.76c-.16.7-.84 1.28-1.78 1.5l-3.54-1.14v2.06m-6.28-2.02l-3.1-1c-.96-.32-1.52-.88-1.52-1.54 0-.6.46-1.1 1.22-1.4l2.42.76c-.44.18-.7.42-.7.66 0 .34.46.68 1.18.9l.5.16v2.46z" />
  </svg>
);

const XboxLogoSVG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1.46 15.65c-1.3-.84-3.5-2.88-5.32-5.74.88-.16 2.1-.2 3.6.14 1.46 1.44 2.66 3.4 3.2 5.3-.46.12-1 .18-1.48.3m3.04-.3c.5-.16 1-.36 1.46-.62.58-1.94 1.8-3.92 3.3-5.38 1.54-.36 2.8-.32 3.7-.14-1.84 2.9-4.08 4.96-5.4 5.82M8.1 4.54c1.84.58 3.32 2.32 4.12 4.46-1.36 1.1-2.92 1.6-4.54 1.76-1.34.12-2.46-.08-3.26-.3C5.58 7.9 6.64 5.8 8.1 4.54m7.8 0c1.46 1.26 2.5 3.36 3.66 5.92-.8.24-1.92.42-3.26.3-1.64-.16-3.18-.66-4.56-1.76.8-2.12 2.3-3.86 4.16-4.46" />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isElectron = searchParams.get('electron') === 'true';
  const { login, loginWithGoogle, loginWithTwitch, register, devLogin } = useAuth();

  const [mode, setMode] = useState<'ps5' | 'xbox'>('ps5');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isPS5 = mode === 'ps5';

  const wakeTerminal = () => {
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      
      if (isElectron && (window as any).gameVault) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await (window as any).gameVault.setToken(session.access_token);
          return;
        }
      }

      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTwitch = async () => {
    setError('');
    try {
      await loginWithTwitch();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#8b5cf6]/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div animate={{ backgroundColor: isPS5 ? 'rgba(56,189,248,0.1)' : 'rgba(34,197,94,0.05)' }} className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] transition-colors duration-1000" />
        <motion.div animate={{ backgroundColor: isPS5 ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.05)' }} className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] transition-colors duration-1000" />
        <div className="absolute inset-0 hex-grid-bg opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">

        {/* Cyberpunk Neon Header */}
        <div className="w-full flex justify-center items-center text-center mb-16 mt-12">
          <div className="text-center mx-auto space-y-2">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
              GAMEVAULT
            </h1>
            <p className="text-[#94a3b8] font-bold tracking-widest text-xs uppercase">
              Initialize Connection
            </p>
          </div>
        </div>

        {/* Logo Toggle */}
        <div className="absolute left-1/2 top-[21%] -translate-x-1/2 z-20 flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMode(isPS5 ? 'xbox' : 'ps5')}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-500 border border-white/20"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))" }}
          >
            <div className="w-8 h-8 object-contain flex items-center justify-center">
              {isPS5 ? (
                <img src="/ps_logo.png" alt="PS5" className="w-full h-full object-contain drop-shadow-md" />
              ) : (
                <img src="/xbox_logo.png" alt="Xbox" className="w-full h-full object-contain drop-shadow-md" />
              )}
            </div>
          </motion.button>
        </div>

        {/* ── Controller Image Container ── */}
        <motion.div
          className="relative w-full max-w-5xl aspect-[1.6] hidden md:flex items-center justify-center select-none mx-auto"
        >
          {/* Controller Background Glow */}
          <div className={`absolute inset-0 rounded-[200px] blur-[120px] -z-10 transition-colors duration-1000 ${isPS5 ? 'bg-blue-500/20' : 'bg-green-500/20'}`} />

          {/* Controller Shape Image (Hollow with neon border) */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-500 z-10 flex items-center justify-center">
            <img
              src="/controller_new.png"
              alt="Controller"
              className="w-[90%] h-[90%] object-contain pointer-events-none transition-all duration-500"
              style={{
                mixBlendMode: 'lighten', // Completely avoids any black background rendering issues
                filter: `invert(1) sepia(1) saturate(500%) hue-rotate(${isPS5 ? '190deg' : '80deg'}) brightness(1.5) drop-shadow(0px 0px 20px ${isPS5 ? 'rgba(59,130,246,0.8)' : 'rgba(34,197,94,0.8)'}) drop-shadow(0px 0px 5px rgba(255,255,255,0.5))`
              }}
            />
          </div>

          {/* ── Dynamic Layout Elements ── */}
          {/* Positioned relative to the new vector controller shape */}

          {/* Text inside Touchpad */}
          <div
            className="absolute z-20 pointer-events-none text-center flex flex-col items-center justify-center"
            style={{
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <p className="font-bold text-[11px] tracking-[0.2em] uppercase text-white/80 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] leading-relaxed">
              CLICK ACTION BUTTONS<br />TO LOGIN
            </p>
          </div>

          {/* D-Pad Transparent Hitbox */}
          <div className="absolute top-[28%] left-[20%] w-[15%] h-[20%] z-20 cursor-pointer rounded-full" onClick={wakeTerminal} />

          {/* Action Buttons Cluster */}
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              top: '36%',
              left: '74.3%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="grid grid-cols-3 grid-rows-3 gap-1">
              {/* Triangle (Top) */}
              <button onClick={wakeTerminal} className={`col-start-2 row-start-1 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-transparent ${isPS5 ? 'text-[#10b981] border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-[#eab308] border-[#eab308] shadow-[0_0_15px_rgba(234,179,8,0.5)]'}`}>
                <span className="font-bold text-2xl leading-none">{isPS5 ? '△' : 'Y'}</span>
              </button>
              {/* Square (Left) */}
              <button onClick={wakeTerminal} className={`col-start-1 row-start-2 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-transparent ${isPS5 ? 'text-[#d946ef] border-[#d946ef] shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'text-[#3b82f6] border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}>
                <span className="font-bold text-2xl leading-none">{isPS5 ? '□' : 'X'}</span>
              </button>
              {/* Circle (Right) */}
              <button onClick={wakeTerminal} className={`col-start-3 row-start-2 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-transparent ${isPS5 ? 'text-[#ef4444] border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-[#ef4444] border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                <span className="font-bold text-2xl leading-none">{isPS5 ? '○' : 'B'}</span>
              </button>
              {/* Cross (Bottom) */}
              <button onClick={wakeTerminal} className={`col-start-2 row-start-3 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-transparent ${isPS5 ? 'text-[#3b82f6] border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-[#22c55e] border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}>
                <span className="font-bold text-2xl leading-none">{isPS5 ? '✕' : 'A'}</span>
              </button>
            </div>
          </div>

          {/* Left Stick (Google) */}
          <div
            className="absolute flex items-center justify-center z-20 pointer-events-auto"
            style={{
              top: '51.5%',
              left: '40.5%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <button
              onClick={() => handleGoogle()}
              className="w-14 h-14 rounded-full bg-transparent flex items-center justify-center border-2 border-transparent transition-all hover:scale-110 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 object-contain">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
          </div>

          {/* Right Stick (Twitch) */}
          <div
            className="absolute flex items-center justify-center z-20 pointer-events-auto"
            style={{
              top: '51.5%',
              left: '63.5%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <button
              onClick={handleTwitch}
              className="w-14 h-14 rounded-full bg-transparent flex items-center justify-center border-2 border-transparent transition-all hover:scale-110 hover:border-[#9146FF]/50 hover:shadow-[0_0_20px_rgba(145,70,255,0.3)]"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 object-contain" fill="#9146FF">
                <path d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.657-6.657v-14.298h-21.691zm19.184 13.433l-4.119 4.119h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.731v10.926zm-9.492-6.985h2.686v4.478h-2.686v-4.478zm4.657 0h2.686v4.478h-2.686v-4.478z" />
              </svg>
            </button>
          </div>

        </motion.div>

        {/* Mobile Fallback */}
        <div className="md:hidden w-full max-w-sm mt-8 p-8 bg-[#0c0c1d] border border-[#8b5cf6]/20 rounded-2xl shadow-xl">
          <h2 className="text-xl font-black text-center mb-6">Login to Vault</h2>
          {error && <div className="mb-4 text-xs text-red-400">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05050a] border border-[#8b5cf6]/20 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6]" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05050a] border border-[#8b5cf6]/20 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6]" required />
            <button type="submit" className="w-full bg-[#8b5cf6] text-white text-sm font-bold py-3 rounded-lg">Sign In</button>
          </form>
          <Link href="/register" className="block text-center mt-4 text-xs text-[#8b5cf6] font-bold">Create Account</Link>
        </div>
      </div>

      {/* Footer actions */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center z-20 pointer-events-auto">
        <Link href="/register" className="px-6 py-2 rounded-full border border-white/20 bg-[#0a0a16]/80 hover:bg-white/10 text-white text-sm font-bold tracking-wide transition-all hover:scale-105 flex items-center gap-2 backdrop-blur-md">
          Create Account <ArrowRight className="w-4 h-4" />
        </Link>
      </div>



      {/* ── INTERACTIVE MODAL SYSTEM ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a16]/90 backdrop-blur-xl border border-[#8b5cf6]/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.2)] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xl font-black p-2"
              >
                ✕
              </button>

              <h2 className="text-2xl font-black text-white text-center mb-6 tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                AUTHENTICATE
              </h2>

              {error && (
                <div className="mb-4 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#05050a]/80 border border-[#8b5cf6]/30 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 transition-all placeholder-white/30"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#05050a]/80 border border-[#8b5cf6]/30 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 transition-all placeholder-white/30"
                  required
                />
                <button type="submit" className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-black tracking-widest py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all active:scale-95 hover:scale-[1.02]">
                  SIGN IN
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/10 flex gap-4">
                <button
                  onClick={() => handleGoogle()}
                  className="flex-1 bg-[#111] border border-white/10 hover:border-[#4285F4]/50 rounded-xl py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(66,133,244,0.3)] transition-all active:scale-95 hover:scale-[1.02] group"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-md">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">Google</span>
                </button>
                <button
                  onClick={handleTwitch}
                  className="flex-1 bg-[#111] border border-white/10 hover:border-[#9146FF]/50 rounded-xl py-3 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(145,70,255,0.3)] transition-all active:scale-95 hover:scale-[1.02] group"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-md" fill="#9146FF">
                    <path d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.657-6.657v-14.298h-21.691zm19.184 13.433l-4.119 4.119h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.731v10.926zm-9.492-6.985h2.686v4.478h-2.686v-4.478zm4.657 0h2.686v4.478h-2.686v-4.478z" />
                  </svg>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">Twitch</span>
                </button>
              </div>

              <div className="mt-8 text-center">
                <Link href="/register" className="text-xs text-[#8b5cf6] font-bold hover:text-white transition-colors hover:underline">
                  Don't have an account? Register here
                </Link>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030308] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
