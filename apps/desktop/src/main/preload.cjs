const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] GameVault bridge initializing (CJS)...');

// SECURITY: Input validation helpers
function validateString(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen);
}

function validatePayload(obj) {
  if (!obj || typeof obj !== 'object') return null;
  return obj;
}
contextBridge.exposeInMainWorld('gameVault', {
  // Auth
  getToken: () => ipcRenderer.invoke('auth:getToken'),
  setToken: (token) => {
    if (token !== null && typeof token !== 'string') return Promise.reject(new Error('Invalid token'));
    return ipcRenderer.invoke('auth:setToken', token);
  },

  // Games
  openFolderDialog: () => ipcRenderer.invoke('games:openFolderDialog'),
  scanFolder: (path) => ipcRenderer.invoke('games:scanFolder', path),
  getDetectedGames: () => ipcRenderer.invoke('games:getDetectedGames'),

  // Playtime
  getCurrentSession: () => ipcRenderer.invoke('playtime:currentSession'),

  // Achievements
  getAchievements: (gameId, payload) => {
    if (typeof gameId !== 'string') return Promise.reject(new Error('Invalid gameId'));
    return ipcRenderer.invoke('achievements:get', validateString(gameId), validatePayload(payload));
  },
  markAchievementDone: (payload) => {
    if (!payload || typeof payload.key !== 'string' || typeof payload.gameId !== 'string') {
      return Promise.reject(new Error('Invalid achievement payload: key and gameId required'));
    }
    return ipcRenderer.invoke('achievements:markDone', payload);
  },
  addCustomChallenge: (challenge) => {
    if (!challenge || typeof challenge !== 'object') return Promise.reject(new Error('Invalid challenge'));
    return ipcRenderer.invoke('challenges:add', challenge);
  },

  // Overlay
  triggerTrophy: (data) => ipcRenderer.invoke('overlay:triggerTrophy', data),

  // Library discovery
  discoverLibrary: () => ipcRenderer.invoke('library:discover'),
  confirmDiscovery: (games) => ipcRenderer.invoke('library:confirmAll', { games }),
  launchGame: (gameId, options) => ipcRenderer.invoke('games:launch', gameId, options),
  setGameExe: (gameId) => ipcRenderer.invoke('games:setExe', gameId),
  selectFile: () => ipcRenderer.invoke('games:selectFile'),

  // ── Launch Events (main → renderer) ─────────────────────────────────────────
  onGameLaunching: (cb) => {
    ipcRenderer.removeAllListeners('game:launching')
    ipcRenderer.on('game:launching', (_, data) => cb(data))
  },
  onGameLaunchFailed: (cb) => {
    ipcRenderer.removeAllListeners('game:launchFailed')
    ipcRenderer.on('game:launchFailed', (_, data) => cb(data))
  },
  onOverlayTrophy: (cb) => {
    ipcRenderer.removeAllListeners('overlay:triggerTrophy')
    ipcRenderer.on('overlay:triggerTrophy', (_, data) => cb(data))
  },
  onExeSet: (cb) => {
    ipcRenderer.removeAllListeners('game:exeSet')
    ipcRenderer.on('game:exeSet', (_, data) => cb(data))
  },

  // Syncing
  syncSteam: (steamId, apiKey) => ipcRenderer.invoke('sync:steam', { steamId, apiKey }),
  syncLocalAchievements: (gameId, exePath) => ipcRenderer.invoke('sync:localAchievements', { gameId, exePath }),
  getApiUsage: () => ipcRenderer.invoke('api:getUsage'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  onUpdateAvailable: (cb) => {
    ipcRenderer.removeAllListeners('update:available');
    ipcRenderer.on('update:available', (_, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.removeAllListeners('update:downloaded');
    ipcRenderer.on('update:downloaded', (_, info) => cb(info));
  },
  onUpdateError: (cb) => {
    ipcRenderer.removeAllListeners('update:error');
    ipcRenderer.on('update:error', (_, error) => cb(error));
  },

  // Events (renderer listens)
  onGameStart: (cb) => {
    ipcRenderer.removeAllListeners('game:started')
    ipcRenderer.on('game:started', (_, data) => cb(data))
  },
  onGameEnd: (cb) => {
    ipcRenderer.removeAllListeners('game:ended')
    ipcRenderer.on('game:ended', (_, data) => cb(data))
  },
  onAchievementUnlocked: (cb) => {
    ipcRenderer.removeAllListeners('achievement:unlocked')
    ipcRenderer.on('achievement:unlocked', (_, data) => cb(data))
  },
  onSyncStatus: (cb) => {
    ipcRenderer.removeAllListeners('sync:status')
    ipcRenderer.on('sync:status', (_, data) => cb(data))
  },
  onLibraryUpdated: (cb) => {
    ipcRenderer.removeAllListeners('library:updated')
    ipcRenderer.on('library:updated', () => cb())
  },
  onOfflineAchievementsDetected: (cb) => {
    ipcRenderer.removeAllListeners('achievements:offlineDetected')
    ipcRenderer.on('achievements:offlineDetected', (_, data) => cb(data))
  },
  // Real-time local DB updates — fired when cracked achievements are persisted
  // so the Trophies tab can auto-refresh without manual refetch.
  onLocalAchievementUpdated: (cb) => {
    ipcRenderer.removeAllListeners('achievements:localDbUpdated');
    ipcRenderer.on('achievements:localDbUpdated', (_, data) => cb(data));
  },
  confirmOfflineAchievements: (achievements) => {
    if (!Array.isArray(achievements)) return Promise.reject(new Error('achievements must be an array'));
    return ipcRenderer.invoke('achievements:confirmOffline', { achievements });
  },
});
