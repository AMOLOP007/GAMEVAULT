const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] GameVault bridge initializing (CJS)...');

contextBridge.exposeInMainWorld('gameVault', {
  // Auth
  getToken: () => ipcRenderer.invoke('auth:getToken'),
  setToken: (token) => ipcRenderer.invoke('auth:setToken', token),

  // Games
  openFolderDialog: () => ipcRenderer.invoke('games:openFolderDialog'),
  scanFolder: (path) => ipcRenderer.invoke('games:scanFolder', path),
  getDetectedGames: () => ipcRenderer.invoke('games:getDetectedGames'),

  // Playtime
  getCurrentSession: () => ipcRenderer.invoke('playtime:currentSession'),

  // Achievements
  getAchievements: (gameId) => ipcRenderer.invoke('achievements:get', gameId),
  addCustomChallenge: (challenge) => ipcRenderer.invoke('challenges:add', challenge),

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
});
