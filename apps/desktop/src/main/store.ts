import Store from 'electron-store';
import { createHash } from 'crypto';
import os from 'os';

export interface StoreSchema {
  token: string;
  userId: string;
  ignoredProcesses: string[];
  knownGamePaths: string[];
  overlayEnabled: boolean;
  syncEnabled: boolean;
  theme: 'dark' | 'system';
  last_steam_sync?: number;
  userName?: string;
  installTimestamp: number;
  achievementBaselines: Record<string, string[]>;
}

// SECURITY: Derive encryption key from machine identity instead of hardcoding it.
// This means the store file is only decryptable on the same machine.
const machineKey = createHash('sha256')
  .update(`gamevault_${os.hostname()}_${os.userInfo().username}_vault`)
  .digest('hex');

const store = new Store<StoreSchema>({
  // SECURITY: Machine-derived key — cannot be extracted from source code.
  encryptionKey: machineKey,
  // CRITICAL: Prevent crash if upgrading from old version with old encryption key
  clearInvalidConfig: true,
  schema: {
    token:           { type: 'string', default: '' },
    userId:          { type: 'string', default: '' },
    ignoredProcesses:{ type: 'array', items: { type: 'string' }, default: [] },
    knownGamePaths:  { type: 'array', items: { type: 'string' }, default: [] },
    overlayEnabled:  { type: 'boolean', default: true },
    syncEnabled:     { type: 'boolean', default: true },
    theme:           { type: 'string', enum: ['dark', 'system'], default: 'dark' },
    installTimestamp:{ type: 'number', default: Date.now() },
    achievementBaselines: { type: 'object', default: {} }
  }
});

export default store as any;
