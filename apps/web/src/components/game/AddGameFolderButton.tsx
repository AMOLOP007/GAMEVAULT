'use client';
import React from 'react';

interface AddGameFolderButtonProps {
  onAddFolder: (path: string) => void;
}

export const AddGameFolderButton: React.FC<AddGameFolderButtonProps> = ({ onAddFolder }) => {
  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && (window as any).gameVault) {
      const path = await (window as any).gameVault.openFolderDialog();
      if (path) {
        onAddFolder(path);
        await (window as any).gameVault.scanFolder(path);
      }
    }
  };

  return (
    <button 
      onClick={handleSelectFolder}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md transition-colors"
    >
      Add Game Folder
    </button>
  );
};
