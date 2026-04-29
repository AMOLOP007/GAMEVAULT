'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import LandingPage from '@/components/landing/LandingPage';
import { GamingLoader } from '@/components/ui/GamingLoader';

export default function HomePage() {
  const router = useRouter();
  const [isElectron, setIsElectron] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if running in Electron environment (the desktop app)
    const userAgent = navigator.userAgent.toLowerCase();
    const isRunningInElectron = userAgent.indexOf(' electron/') > -1;
    setIsElectron(isRunningInElectron);

    if (isRunningInElectron) {
      // If in desktop app, route directly to the app experience
      const token = api.getToken();
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router]);

  // While detecting environment, show a quick loader
  if (isElectron === null) {
    return <GamingLoader fullscreen message="Initializing System..." />;
  }

  // If in electron, we are actively redirecting, so render nothing
  if (isElectron) {
    return null;
  }

  // If in a standard web browser, show the landing page
  return <LandingPage />;
}
