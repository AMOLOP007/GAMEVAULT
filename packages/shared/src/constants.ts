export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const GAME_STATUSES = ['PLAYING', 'COMPLETED', 'DROPPED', 'BACKLOG', 'WISHLIST'] as const;
export const LINK_TAGS = ['OFFICIAL', 'STORE', 'MOD', 'GUIDE', 'BACKUP', 'OTHER'] as const;

// Desktop tracker constants
export const TRACKER = {
  IDLE_POLL_INTERVAL: 3000,      // 3 seconds when no game running
  GAMING_POLL_INTERVAL: 30000,   // 30 seconds during gameplay
  SYNC_DEBOUNCE: 5000,           // Wait 5s after game exits before syncing
  MAX_BUFFER_SIZE: 100,          // Max sessions to buffer before force-sync
} as const;
