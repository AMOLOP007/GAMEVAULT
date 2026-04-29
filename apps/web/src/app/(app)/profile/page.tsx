'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Shield, DownloadCloud, Crown } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-5">
      {/* ── Header ── */}
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/15">
            <Crown className="w-5 h-5 text-[#c084fc]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Profile</h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#64748b] font-medium text-sm ml-[52px]"
        >
          Your account & settings
        </motion.p>
      </div>

      {/* ── Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-7"
      >
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-7">
          <div className="w-16 h-16 rounded-2xl gradient-vivid flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user.username}</h2>
            <p className="text-[10px] font-bold text-[#8b5cf6]/50 uppercase tracking-[0.15em]">Vault Member</p>
          </div>
        </div>

        {/* Info Fields */}
        <div className="space-y-2.5">
          <ProfileField icon={<User className="w-4 h-4" />} label="Username" value={user.username} />
          <ProfileField icon={<Mail className="w-4 h-4" />} label="Email" value={user.email} />
          <ProfileField icon={<Shield className="w-4 h-4" />} label="Account Type" value="Local" />
        </div>
      </motion.div>

      {/* ── Steam Integration ── */}
      <SteamIntegrationCard />

      {/* ── API Usage ── */}
      <ApiUsageCard />

      {/* ── Danger Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-5 border-red-500/15"
      >
        <h3 className="text-base font-bold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-[#475569] mb-4">
          These actions are irreversible. Proceed with caution.
        </p>
        <button className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/8 transition-colors uppercase tracking-wider">
          Delete Account
        </button>
      </motion.div>
    </div>
  );
}

function ApiUsageCard() {
  const [usage, setUsage] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchUsage = async () => {
      if ((window as any).gameVault) {
        const data = await (window as any).gameVault.getApiUsage();
        setUsage(data);
      }
    };
    fetchUsage();
  }, []);

  if (!usage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-panel p-5 border-[#10b981]/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-[#10b981]" />
        <h3 className="text-base font-bold text-white">API Usage</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-[#475569] font-bold uppercase">RAWG Daily</p>
          <p className="text-sm font-bold text-white">{usage.rawgDaily} / 600</p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] font-bold uppercase">RAWG Monthly</p>
          <p className="text-sm font-bold text-white">{usage.rawgMonthly} / 18,000</p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] font-bold uppercase">Cached Games</p>
          <p className="text-sm font-bold text-white">{usage.cacheSize}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] font-bold uppercase">API Status</p>
          <p className={`text-sm font-bold ${usage.isOnline ? 'text-[#10b981]' : 'text-red-400'}`}>
            {usage.isOnline ? '● Online' : '○ Offline'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06 hover:border-[#8b5cf6]/12 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/8 flex items-center justify-center text-[#8b5cf6]/40 border border-[#8b5cf6]/08">
        {icon}
      </div>
      <div>
        <p className="text-[9px] text-[#475569] font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function SteamIntegrationCard() {
  const [steamId, setSteamId] = React.useState('');
  const [steamApiKey, setSteamApiKey] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const handleSync = async () => {
    if (!steamId) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.syncSteamLibrary(steamId, steamApiKey);
      setMessage(`Successfully synced ${res.gamesAdded} games and ${res.achievementsAdded} achievements!`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="glass-panel p-5 border-[#60a5fa]/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <DownloadCloud className="w-4 h-4 text-[#60a5fa]" />
        <h3 className="text-base font-bold text-white">Steam Integration</h3>
      </div>
      <p className="text-xs text-[#475569] mb-4">
        Enter your Steam ID and API Key to sync your library.
      </p>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="Steam ID (e.g. 7656119...)"
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={handleSync}
            disabled={loading || !steamId}
            className="btn-primary disabled:opacity-40 min-w-28 text-sm"
          >
            {loading ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        <input
          type="password"
          value={steamApiKey}
          onChange={(e) => setSteamApiKey(e.target.value)}
          placeholder="Steam API Key (Optional if set on server)"
          className="input-field w-full text-sm"
        />
      </div>
      {message && <p className="text-xs mt-3 text-[#94a3b8]">{message}</p>}
    </motion.div>
  );
}
