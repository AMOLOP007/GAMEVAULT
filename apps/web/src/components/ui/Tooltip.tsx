'use client';

import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col items-center z-50">
        <div className="relative p-2.5 text-[11px] leading-none text-white whitespace-nowrap bg-[#0c0c1d] border border-[#8b5cf6]/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-lg font-bold">
          {content}
        </div>
        <div className="w-2.5 h-2.5 -mt-1.5 rotate-45 bg-[#0c0c1d] border-r border-b border-[#8b5cf6]/15" />
      </div>
    </div>
  );
}
