'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Loader2, Gamepad2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();

  const [screenState, setScreenState] = useState<'idle' | 'register' | 'loading'>('idle');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const wakeTerminal = () => {
    if (screenState === 'idle') setScreenState('register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScreenState('loading');
    try {
      await register(email, username, password);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setScreenState('register');
    }
  };

  const handleGoogle = async () => {
    setScreenState('loading');
    setError('');
    try {
      await loginWithGoogle();
      // Supabase will redirect, so we don't necessarily need to push here
    } catch (err: any) {
      setError(err.message);
      setScreenState('register');
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#8b5cf6]/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#a855f7]/5 rounded-full blur-[200px]" />
        <div className="absolute inset-0 hex-grid-bg opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center px-4">
        
        {/* Cyberpunk Neon Header */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
            GAMEVAULT
          </h1>
          <p className="text-[#94a3b8] font-bold tracking-widest text-xs uppercase">
            Initialize New System
          </p>
        </div>

        {/* ── Handheld Console (Steam Deck / Switch Style) ── */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 25 }}
          className="relative w-[950px] h-[440px] hidden md:flex items-center justify-between bg-gradient-to-b from-[#1c1c24] to-[#0f0f14] rounded-[100px] shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_5px_10px_rgba(255,255,255,0.05),inset_0_-10px_20px_rgba(0,0,0,0.9)] border-[6px] border-[#050508] px-8 select-none"
        >
          {/* Left Grip / Controls */}
          <div className="w-32 h-full flex flex-col justify-around items-center py-10 relative">
            {/* L1/L2 Bumpers (Visual only) */}
            <div className="absolute -top-3 left-6 w-24 h-6 bg-[#222] rounded-t-xl -z-10 border-t border-[#444]" />
            <div className="absolute -top-6 left-10 w-16 h-4 bg-[#111] rounded-t-lg -z-20" />
            
            <div className="w-20 h-20 rounded-full bg-[#111] border-2 border-[#222] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9),0_5px_10px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={wakeTerminal}>
               <div className="w-14 h-14 rounded-full bg-[#1a1a1a] shadow-[inset_0_2px_5px_rgba(255,255,255,0.1)] border border-[#333]" />
            </div>

            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute w-8 h-20 bg-[#262626] rounded-md shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),0_5px_10px_rgba(0,0,0,0.5)]" />
              <div className="absolute w-20 h-8 bg-[#262626] rounded-md shadow-[inset_0_2px_5px_rgba(255,255,255,0.1),0_5px_10px_rgba(0,0,0,0.5)]" />
              <button onClick={wakeTerminal} className="absolute w-full h-full z-10 cursor-pointer rounded-full" />
            </div>

            {/* View Button */}
            <button onClick={() => {}} className="w-4 h-6 bg-[#333] rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] absolute top-[110px] right-2" />
          </div>

          {/* Center Screen */}
          <div className="flex-1 h-[360px] bg-[#000] rounded-[30px] border-[14px] border-[#08080c] shadow-[inset_0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col justify-center items-center cursor-pointer" onClick={wakeTerminal}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

            <AnimatePresence mode="wait">
              {screenState === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#a855f7]/10 flex items-center justify-center mb-4">
                    <Gamepad2 className="w-10 h-10 text-[#a855f7]" />
                  </div>
                  <p className="text-[#a855f7] font-bold text-lg tracking-widest uppercase animate-pulse">Power On</p>
                </motion.div>
              )}

              {screenState === 'register' && (
                <motion.div key="register" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full h-full bg-[#0a0a16] p-8 flex flex-col justify-center relative z-10">
                  <h2 className="text-xl font-black text-white mb-4">Create Account</h2>
                  
                  {error && (
                    <div className="mb-3 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-[#a855f7]" required />
                      <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-[#a855f7]" required />
                    </div>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-md px-3 py-2 text-xs text-white outline-none focus:border-[#a855f7]" required />
                    
                    <button type="submit" className="w-full bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold py-2.5 rounded-md shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                      Register System
                    </button>
                  </form>

                  <div className="w-full max-w-sm mx-auto mt-4 pt-4 border-t border-white/5 flex gap-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleGoogle()} className="flex-1 bg-white/5 hover:bg-white/10 text-xs font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-2 border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-[#4285F4]" /> Google
                    </button>
                  </div>
                </motion.div>
              )}

              {screenState === 'loading' && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center bg-[#0a0a16] w-full h-full justify-center">
                  <Loader2 className="w-10 h-10 text-[#a855f7] animate-spin mb-4" />
                  <p className="text-xs text-[#a855f7] font-bold tracking-widest uppercase">Initializing...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Small Redirect to Login */}
            <div className="absolute top-6 right-6 z-40">
              <Link href="/login" className="px-4 py-1.5 rounded-full bg-[#111] border border-white/10 text-[10px] font-bold text-white shadow-lg hover:bg-white/10 hover:border-white/30 transition-all flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <ArrowLeft className="w-3 h-3 text-[#a855f7]" /> Back to Login
              </Link>
            </div>
          </div>

          {/* Right Grip / Controls */}
          <div className="w-32 h-full flex flex-col justify-around items-center py-10 relative">
             {/* R1/R2 Bumpers */}
             <div className="absolute -top-3 right-6 w-24 h-6 bg-[#222] rounded-t-xl -z-10 border-t border-[#444]" />
             <div className="absolute -top-6 right-10 w-16 h-4 bg-[#111] rounded-t-lg -z-20" />

             {/* Menu Button */}
             <button onClick={() => {}} className="w-4 h-6 bg-[#333] rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] absolute top-[110px] left-2" />

             <div className="relative w-24 h-24 flex items-center justify-center">
                <button onClick={wakeTerminal} className="absolute top-0 w-8 h-8 rounded-full bg-[#262626] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),0_5px_10px_rgba(0,0,0,0.5)] text-[#eab308] font-black text-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">Y</button>
                <button onClick={wakeTerminal} className="absolute right-0 w-8 h-8 rounded-full bg-[#262626] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),0_5px_10px_rgba(0,0,0,0.5)] text-[#ef4444] font-black text-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">B</button>
                <button onClick={wakeTerminal} className="absolute bottom-0 w-8 h-8 rounded-full bg-[#262626] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),0_5px_10px_rgba(0,0,0,0.5)] text-[#22c55e] font-black text-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">A</button>
                <button onClick={wakeTerminal} className="absolute left-0 w-8 h-8 rounded-full bg-[#262626] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),0_5px_10px_rgba(0,0,0,0.5)] text-[#3b82f6] font-black text-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">X</button>
             </div>

             <div className="w-20 h-20 rounded-full bg-[#111] border-2 border-[#222] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9),0_5px_10px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={wakeTerminal}>
               <div className="w-14 h-14 rounded-full bg-[#1a1a1a] shadow-[inset_0_2px_5px_rgba(255,255,255,0.1)] border border-[#333]" />
             </div>
          </div>
        </motion.div>

        {/* Mobile Fallback */}
        <div className="md:hidden w-full max-w-sm mt-8 p-8 bg-[#0c0c1d] border border-[#a855f7]/20 rounded-2xl shadow-xl">
           <h2 className="text-xl font-black text-center mb-6">Create Account</h2>
           {error && <div className="mb-4 text-xs text-red-400">{error}</div>}
           <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#a855f7]" required />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#a855f7]" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05050a] border border-[#a855f7]/20 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#a855f7]" required />
              <button type="submit" className="w-full bg-[#a855f7] text-white text-sm font-bold py-3 rounded-lg">Register</button>
           </form>
           <div className="mt-4">
             <button onClick={() => handleGoogle()} className="w-full bg-white/5 border border-white/10 text-white text-sm font-bold py-3 rounded-lg hover:bg-white/10 transition-all">
               Sign up with Google
             </button>
           </div>
           <Link href="/login" className="block text-center mt-4 text-xs text-[#a855f7] font-bold">Back to Login</Link>
        </div>

      </div>
    </div>
  );
}
