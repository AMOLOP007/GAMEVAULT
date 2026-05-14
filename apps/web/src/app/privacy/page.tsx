'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Server, UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030308] text-slate-300 font-sans selection:bg-[#8b5cf6]/30">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8b5cf6] hover:text-white transition-colors mb-12 group no-underline">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Vault
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">Privacy Policy</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Last Updated: April 30, 2026</p>
          </header>

          <section className="glass-panel p-8 md:p-12 space-y-12">
            <div className="flex gap-6">
              <div className="p-4 rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6] shrink-0 h-fit">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Our Philosophy</h2>
                <p className="leading-relaxed">
                  GameVault is a powerful game launcher and playtime measurer built on the principle of <strong>Local-First Sovereignty</strong>. We believe your gaming data—your playtime, your library, and your achievements—should belong to you, not a corporation. Our architecture is designed to keep your sensitive data on your machine, syncing only what is necessary for social features and cross-device convenience.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-[#34d399]">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-xs">Data Collection</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  We collect your email and username for authentication purposes. When using the Desktop App, we process game execution data locally to track playtime. This data is only uploaded to our cloud servers if you have a registered account and "Sync" enabled. To provide a complete experience, the app may also detect and set up achievement tracking for games in your library by checking local files and fetching achievement schemas from public sources. This process happens entirely on your device.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-[#3b82f6]">
                  <Eye className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-xs">Third-Party Sync</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  If you choose to link your Steam, Epic, or GOG accounts, we only request read-only access to your public library and achievements. We never store your login credentials for these services; all authentication happens via official OAuth providers.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <Server className="w-6 h-6 text-[#8b5cf6]" /> Data Security
              </h2>
              <p className="leading-relaxed text-slate-400">
                All data transmitted between the GameVault Desktop Client and our API is encrypted using industry-standard TLS 1.3. Your local database is stored in an unencrypted SQLite format within your user profile directory, accessible only by your operating system user. We recommend using full-disk encryption (like BitLocker or FileVault) for maximum local security.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-[#d946ef]" /> Your Rights
              </h2>
              <p className="leading-relaxed text-slate-400">
                You have the absolute right to:
              </p>
              <ul className="list-none space-y-4 p-0">
                {[
                  'Export your entire library and playtime history in JSON format.',
                  'Request the permanent deletion of your account and all associated cloud data.',
                  'Disable social features and library syncing at any time, reverting to a purely local experience.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-12 border-t border-white/5 text-center">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.3em]">
                GameVault • Built with Integrity • 2026
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
