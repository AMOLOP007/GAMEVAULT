'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function SafeImage({ src, alt, className = '', fallbackText = '?' }: SafeImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src || error) {
    return (
      <div className={`bg-gradient-to-br from-[#111128] to-[#08081a] flex items-center justify-center border border-[#8b5cf6]/08 ${className}`}>
        <span className="text-[#8b5cf6]/30 font-black text-lg">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 skeleton z-10" />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={`object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
