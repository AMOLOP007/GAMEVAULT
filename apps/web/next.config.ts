import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PROD: Standalone mode produces a self-contained build for the installer
  output: 'standalone',

  // PERF: Suppress Next.js dev toolbar popup inside Electron
  // The floating "N" button and hot-reload overlay are not useful in the app context
  devIndicators: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.rawg.io' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'cdn.cloudflare.steamstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
