'use client';

import React from 'react';

export function GameCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#8b5cf6]/08 bg-[#0c0c1d]/50 p-3.5 space-y-3">
      <div className="aspect-[3/4] rounded-lg bg-[#8b5cf6]/04 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3.5 w-3/4 bg-[#8b5cf6]/06 rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-[#8b5cf6]/04 rounded animate-pulse" />
      </div>
      <div className="flex justify-between items-center pt-1">
        <div className="h-5 w-14 bg-[#8b5cf6]/06 rounded-md animate-pulse" />
        <div className="h-3 w-10 bg-[#8b5cf6]/04 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function LibraryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}
