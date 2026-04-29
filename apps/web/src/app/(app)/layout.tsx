'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import AmbientBackground from '@/components/effects/AmbientBackground';
import PageTransition from '@/components/layout/PageTransition';
import { GamingLoader } from '@/components/ui/GamingLoader';
import TrophyNotification from '@/components/ui/TrophyNotification';
import WelcomeOverlay from '@/components/ui/WelcomeOverlay';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
    </div>
  );
}
