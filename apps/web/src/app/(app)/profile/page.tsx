'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Shield, DownloadCloud, Crown, Settings, Bell, HardDrive } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const usernameInitials = user.username?.[0]?.toUpperCase() || 'G';

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
        className="glass-panel p-7 border-[#8b5cf6]/10"
      >
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-7">
          <div className="w-16 h-16 rounded-2xl gradient-vivid flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            {usernameInitials}
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

      {/* ── Preferences ── */}
      <PreferencesCard />

      {/* ── Steam Integration ── */}
      <SteamIntegrationCard />

      {/* ── App Info ── */}
      <AppInfoCard />

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

function PreferencesCard() {
  const [overlayEnabled, setOverlayEnabled] = React.useState(true);
  
  React.useEffect(() => {
    // In a real implementation this would fetch from electron-store via IPC
    if ((window as any).gameVault?.getStoreValue) {
      (window as any).gameVault.getStoreValue('overlayEnabled').then((val: boolean) => {
        if (val !== undefined) setOverlayEnabled(val);
      });
    }
  }, []);

  const handleToggleOverlay = async () => {
    const newValue = !overlayEnabled;
    setOverlayEnabled(newValue);
    if ((window as any).gameVault?.setStoreValue) {
      await (window as any).gameVault.setStoreValue('overlayEnabled', newValue);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="glass-panel p-5 border-[#8b5cf6]/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-[#a855f7]" />
        <h3 className="text-base font-bold text-white">Preferences</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8b5cf6]/10">
              <Bell className="w-4 h-4 text-[#c084fc]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Trophy Overlay Notifications</p>
              <p className="text-[10px] text-[#64748b]">Show popups when achievements are unlocked</p>
            </div>
          </div>
          <button 
            onClick={handleToggleOverlay}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${overlayEnabled ? 'bg-[#8b5cf6]' : 'bg-[#334155]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${overlayEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AppInfoCard() {
  const [updateStatus, setUpdateStatus] = React.useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gameVault) {
      (window as any).gameVault.onUpdateAvailable(() => setUpdateStatus('Update available, downloading...'));
      (window as any).gameVault.onUpdateDownloaded(() => setUpdateStatus('Update downloaded. Ready to install.'));
      (window as any).gameVault.onUpdateError((err: string) => setUpdateStatus('Update failed: ' + err));
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (typeof window !== 'undefined' && (window as any).gameVault?.checkForUpdates) {
      setUpdateStatus('Checking for updates...');
      const res = await (window as any).gameVault.checkForUpdates();
      if (!res.success) setUpdateStatus('Check failed: ' + res.error);
      else if (!res.info) setUpdateStatus('You are up to date.');
    }
  };

  const handleInstallUpdate = () => {
    if (typeof window !== 'undefined' && (window as any).gameVault?.installUpdate) {
      (window as any).gameVault.installUpdate();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-panel p-5 border-[#8b5cf6]/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-4 h-4 text-[#a855f7]" />
        <h3 className="text-base font-bold text-white">App Information</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3.5 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06">
          <p className="text-[10px] text-[#475569] font-bold uppercase tracking-wider mb-1">GameVault Version</p>
          <p className="text-sm font-bold text-white">1.3.0-rc.1</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06">
          <p className="text-[10px] text-[#475569] font-bold uppercase tracking-wider mb-1">Local Storage</p>
          <p className="text-sm font-bold text-white">Optimized</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#0c0c1d]/60 border border-[#8b5cf6]/06">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Software Update</p>
            {updateStatus && <p className="text-[10px] text-[#c084fc]">{updateStatus}</p>}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCheckUpdates}
              className="px-3 py-1.5 rounded-lg border border-[#8b5cf6]/20 text-[#a855f7] text-xs font-bold hover:bg-[#8b5cf6]/10 transition-colors"
            >
              Check Updates
            </button>
            {updateStatus === 'Update downloaded. Ready to install.' && (
              <button 
                onClick={handleInstallUpdate}
                className="px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-bold hover:bg-[#7c3aed] transition-colors"
              >
                Install Now
              </button>
            )}
          </div>
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
      transition={{ delay: 0.1 }}
      className="glass-panel p-5 border-[#8b5cf6]/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <DownloadCloud className="w-4 h-4 text-[#a855f7]" />
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
            className="input-field flex-1 text-sm border-[#8b5cf6]/20 focus:border-[#a855f7]"
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
          className="input-field w-full text-sm border-[#8b5cf6]/20 focus:border-[#a855f7]"
        />
      </div>
      {message && <p className="text-xs mt-3 text-[#c084fc]">{message}</p>}
    </motion.div>
  );
}

