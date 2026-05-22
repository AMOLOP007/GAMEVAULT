import Store from 'electron-store';

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

const store = new Store<StoreSchema>({
  // SECURITY: Obfuscate stored tokens so they can't be read by simply opening the JSON file.
  // This is not true encryption (key is in code), but it prevents casual credential theft.
  encryptionKey: 'gv_s3cur3_st0re_k3y_2026',
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
