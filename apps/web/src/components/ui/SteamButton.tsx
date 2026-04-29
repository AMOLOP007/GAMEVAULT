'use client';

import React, { useState } from 'react';
import { AnimatedButton } from './AnimatedButton';
import { Tooltip } from './Tooltip';
import { Modal } from './Modal';
import { isSteamEnabled } from '@/lib/utils';

export function SteamButton() {
  const [showModal, setShowModal] = useState(false);
  const enabled = isSteamEnabled();

  const handleClick = () => {
    if (!enabled) {
      setShowModal(true);
    } else {
      // Logic for Steam Sync
      console.log('Syncing Steam...');
    }
  };

  const button = (
    <AnimatedButton
      variant="outline"
      onClick={handleClick}
      className={`w-full bg-[#1b2838]/60 border-[#8b5cf6]/10 hover:bg-[#2a475e]/60 text-[#66c0f4] ${!enabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 0-9.927 8.79l4.524 2.133a3.504 3.504 0 0 1 2.296-1.123V9.5h3.606v2.299a3.518 3.518 0 0 1 2.456 3.424 3.5 3.5 0 0 1-3.5 3.5c-.247 0-.482-.027-.714-.075l-2.022 4.148h9.281A10 10 0 0 0 12 2zm-1.054 13.226c0 .546-.443.987-.987.987-.546 0-.987-.443-.987-.987 0-.546.443-.987.987-.987.546 0 .987.443.987.987z" />
      </svg>
      Import from Steam
    </AnimatedButton>
  );

  return (
    <>
      {!enabled ? (
        <Tooltip content="Steam integration not configured">
          {button}
        </Tooltip>
      ) : button}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Steam Integration"
      >
        <div className="space-y-4">
          <p className="text-[#94a3b8] text-sm leading-relaxed">
            Steam integration is currently locked. To enable, add your <code className="text-[#c084fc] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded text-xs font-bold">STEAM_API_KEY</code> to the <code className="text-[#60a5fa] bg-[#60a5fa]/10 px-1.5 py-0.5 rounded text-xs font-bold">.env.local</code> file.
          </p>
          <div className="p-3 bg-[#8b5cf6]/04 rounded-lg border border-[#8b5cf6]/10">
            <p className="text-[10px] text-[#475569] font-medium">
              Get your key from the Steam Community Developer page.
            </p>
          </div>
          <AnimatedButton onClick={() => setShowModal(false)} className="w-full">
            Got it
          </AnimatedButton>
        </div>
      </Modal>
    </>
  );
}
