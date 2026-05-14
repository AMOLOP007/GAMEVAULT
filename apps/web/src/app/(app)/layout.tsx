'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import AmbientBackground from '@/components/effects/AmbientBackground';
import PageTransition from '@/components/layout/PageTransition';
import { GamingLoader } from '@/components/ui/GamingLoader';
import TrophyNotification from '@/components/ui/TrophyNotification';
import WelcomeOverlay from '@/components/ui/WelcomeOverlay';
import { Modal } from '@/components/ui/Modal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [offlineAchievements, setOfflineAchievements] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gameVault?.onOfflineAchievementsDetected) {
      (window as any).gameVault.onOfflineAchievementsDetected((achievements: any[]) => {
        setOfflineAchievements(achievements);
        setIsModalOpen(true);
      });
    }
  }, []);

  const handleConfirmOffline = async () => {
    setIsModalOpen(false);
    if ((window as any).gameVault?.confirmOfflineAchievements) {
      await (window as any).gameVault.confirmOfflineAchievements(offlineAchievements);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030308]">
        <GamingLoader message="Entering the vault..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#030308] relative">
      <AmbientBackground />
      <Sidebar />
      <main className="main-content relative z-10">
        <div className="max-w-[1600px] mx-auto w-full">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <TrophyNotification />
      <WelcomeOverlay />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Offline Trophies Detected!"
      >
        <div className="space-y-4">
          <p className="text-[#94a3b8] text-sm">
            We detected that you earned <span className="text-[#a855f7] font-bold">{offlineAchievements.length}</span> trophies while GameVault was closed.
          </p>
          <div className="bg-[#030308]/50 rounded-lg p-3 border border-[#8b5cf6]/10 max-h-40 overflow-y-auto space-y-2">
            {offlineAchievements.map((ach, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                <span className="truncate max-w-[120px] font-medium">{ach.gameTitle}</span>: {ach.name}
              </div>
            ))}
          </div>
          <p className="text-[#64748b] text-xs">
            Would you like to sync them and see them popped?
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleConfirmOffline}
              className="px-4 py-2 text-sm bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white rounded-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all font-medium"
            >
              Pop Them! 🏆
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
