'use client';
import React from 'react';

interface ScanProgressIndicatorProps {
  progress: number; // 0 to 100
  statusText: string;
}

export const ScanProgressIndicator: React.FC<ScanProgressIndicatorProps> = ({ progress, statusText }) => {
  return (
    <div className="w-full max-w-md mx-auto my-4 p-4 bg-gray-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-200">{statusText}</span>
        <span className="text-sm font-bold text-blue-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
