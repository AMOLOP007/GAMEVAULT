'use client';
import React, { useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UploadLogoButtonProps {
  gameId: string;
  onUploadSuccess: (newUrl: string) => void;
}

export const UploadLogoButton: React.FC<UploadLogoButtonProps> = ({ gameId, onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${gameId}-${Math.random()}.${fileExt}`;
      const filePath = `game-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('custom_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('custom_assets').getPublicUrl(filePath);
      
      // Update DB
      await supabase.from('games').update({ cover_url: data.publicUrl }).eq('id', gameId);
      
      onUploadSuccess(data.publicUrl);
    } catch (error) {
      console.error('Error uploading custom logo:', error);
      alert('Failed to upload custom logo');
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-1 px-3 rounded border border-gray-600 transition-colors"
      >
        Upload Custom Cover
      </button>
    </div>
  );
};
