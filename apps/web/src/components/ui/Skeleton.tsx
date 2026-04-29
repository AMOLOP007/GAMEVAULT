import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const baseClass = "animate-pulse bg-white/5 border border-white/5";
  const variantClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-3 w-full' : 'rounded-xl';
  
  return (
    <div className={`${baseClass} ${variantClass} ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-3 glass-panel border-white/5 space-y-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2 opacity-50" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="p-5 glass-panel border-white/5 space-y-2">
      <Skeleton variant="circle" className="w-8 h-8" />
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="text" className="h-6 w-1/3" />
    </div>
  );
}
