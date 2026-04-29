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
}

const store = new Store<StoreSchema>({
  schema: {
    token:           { type: 'string', default: '' },
    userId:          { type: 'string', default: '' },
    ignoredProcesses:{ type: 'array', items: { type: 'string' }, default: [] },
    knownGamePaths:  { type: 'array', items: { type: 'string' }, default: [] },
    overlayEnabled:  { type: 'boolean', default: true },
    syncEnabled:     { type: 'boolean', default: true },
    theme:           { type: 'string', enum: ['dark', 'system'], default: 'dark' },
  }
});

export default store as any;
