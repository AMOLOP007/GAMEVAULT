'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface BackgroundVideoProps {
  src: string;
}

export function BackgroundVideo({ src }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Browser supports HLS natively (Safari)
      video.src = src;
    } else if (Hls.isSupported()) {
      // Use hls.js for other browsers
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      
      return () => {
        hls.destroy();
      };
    }
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover opacity-60" // Reduced opacity to let GameVault dark theme shine
      />
      {/* Subtle overlay to ensure text readability and theme consistency */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030308]/60 via-transparent to-[#030308]" />
    </div>
  );
}
