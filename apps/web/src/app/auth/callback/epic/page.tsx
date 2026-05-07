'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function EpicCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      const handleCallback = async () => {
        try {
          const res = await api.post<any>('/api/auth/epic/callback', { code });
          // Notify the opener window with the token
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'EPIC_AUTH_SUCCESS', 
              accessToken: res.accessToken,
              accountId: res.accountId
            }, window.location.origin);
            window.close();
          } else {
            router.push('/trophies');
          }
        } catch (err) {
          console.error('Epic OAuth failed:', err);
        }
      };
      handleCallback();
    }
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#0c0c1d] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-white">Linking Epic Account...</h1>
        <p className="text-sm text-white/40 mt-2">Please do not close this window.</p>
      </div>
    </div>
  );
}

export default function EpicCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0c1d] flex items-center justify-center text-white">Loading...</div>}>
      <EpicCallback />
    </Suspense>
  );
}
