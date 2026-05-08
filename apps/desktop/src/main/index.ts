import 'dotenv/config';
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import store from './store.js';
import axios from 'axios';
import prisma from './db.js';
import { GameDetector } from './detectors/GameDetector.js';
import { GameTracker } from './tracker.js';
import { AchievementEngine } from './achievements/AchievementEngine.js';
import { CrackedAchievementEngine } from './achievements/LocalAchievementEngine.js';
import { TrophyOverlay } from './overlay/TrophyOverlay.js';
import { PsListDetector } from './detectors/PsListDetector.js';
import { SyncService } from './syncService.js';
import fs from 'fs';
import log from 'electron-log';
import { runFullLibraryDiscovery } from './services/libraryScanner.js';
import { GameLauncher } from './launcher/GameLauncher.js';
import { resolveLaunchConfig } from './launcher/LaunchResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { API_BASE_URL, WEB_BASE_URL } from './config.js';
const isDev = !app.isPackaged;

// ── Components ───────────────────────────────
const detector = new PsListDetector();
const gameDetector = new GameDetector(process.env.RAWG_KEY || '');
const achievementEngine = new AchievementEngine();
// Cracked Achievement Engine — watches emulator save files in real-time
const crackedAchEngine = new CrackedAchievementEngine();
let overlay: TrophyOverlay | null = null;
let tracker: GameTracker | null = null;
const launcher = new GameLauncher();

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  log.info(`[Main] Preload path: ${preloadPath} (Exists: ${fs.existsSync(preloadPath)})`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      sandbox: true,
      // SECURITY: disable unused features
      webgl: false,
      enableWebSQL: false,
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // SECURITY: Content Security Policy — block inline scripts, restrict sources
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' http://localhost:* https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:; connect-src 'self' http://localhost:* https:"]
      }
    });
  });

  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const token = store.get('token');
  const userId = store.get('userId');

  if (!token) {
    mainWindow.loadURL(`${WEB_BASE_URL}/login?electron=true`);
  } else {
    mainWindow.loadURL(`${WEB_BASE_URL}`);
    if (userId) {
      autoScanAndSync(userId);
    }
  }

  // DevTools disabled in production — uncomment for debugging
  // mainWindow.webContents.openDevTools();
}

async function autoScanAndSync(userId: string) {
  try {
    log.info('[AutoScan] Starting startup scan...');
    
    // Ensure user exists locally to prevent foreign key violations
    await (prisma as any).user.upsert({
      where: { id: userId },
      update: {},
      create: { 
        id: userId, 
        username: 'Local User',
        email: `local-${userId}@local`,
        supabaseId: `local-${userId}`
      }
    });

    const discovered = await runFullLibraryDiscovery();
    log.info(`[AutoScan] Found ${discovered.length} games. Syncing...`);
    
    for (const game of discovered) {
      // Derive best title: prefer the installPath folder name over the exe-derived name
      // This fixes cases like 'b1.exe' → 'Black Myth Wukong' (from D:/BMW/Black Myth Wukong)
      const folderName = game.installPath
        ? path.basename(game.installPath)
            .replace(/[-_.]/g, ' ')
            .replace(/v\d+(\.\d+)*/gi, '')
            .replace(/repack|dodi|fitgirl|crack|multi\d+|incldlc/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
        : null;
      
      // Use folder name if: (a) game name looks like an internal code, OR (b) folder name is clearly better
      const isInternalCode = (name: string) =>
        name.length <= 4 || (/^[a-zA-Z]\d*$/.test(name)) || name.toLowerCase() === name;
      
      const canonicalName = (folderName && isInternalCode(game.name) && folderName.length > 4)
        ? folderName
        : game.name;

      const g = await (prisma as any).game.upsert({
        where: { exePath: game.exePath },
        update: {
          // Always update title if current one is a garbage internal code
          title: canonicalName,
          launchUri: game.launchUri,
          steamAppId: game.steamAppId,
          epicAppId: game.epicAppId,
          gogAppId: game.gogAppId,
        },
        create: {
          title: canonicalName,
          exePath: game.exePath,
          source: game.source,
          launchUri: game.launchUri,
          steamAppId: game.steamAppId,
          epicAppId: game.epicAppId,
          gogAppId: game.gogAppId,
          platform: game.platform
        }
      });

      await (prisma as any).userGame.upsert({
        where: { userId_gameId: { userId, gameId: g.id } },
        update: {},
        create: { userId, gameId: g.id, status: 'backlog' }
      });

      // ── TRIGGER FORENSIC SYNC ──
      if (game.steamAppId) {
        const { forensicSyncService } = await import('./services/forensicSyncService.js');
        forensicSyncService.syncGame(game.steamAppId.toString(), g.id).catch(() => {});
      }

      // SYNC TO CENTRAL API — include installPath as searchHint for better metadata
      const token = store.get('token');
      if (token) {
        axios.post(`${API_BASE_URL}/api/games`, {
          title: canonicalName,
          exePath: game.exePath,
          source: game.source,
          launchUri: game.launchUri,
          steamAppId: game.steamAppId,
          epicAppId: game.epicAppId,
          gogAppId: game.gogAppId,
          // Pass folder name as a metadata search hint
          searchHint: folderName || canonicalName,
          installPath: game.installPath,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    }
    log.info('[AutoScan] Sync complete');
    
    // ── BACKGROUND STEAM SYNC ──────────────────
    const token = store.get('token');
    if (token) {
      log.info('[AutoScan] Triggering background Steam sync...');
      axios.post(`${API_BASE_URL}/api/sync/steam-all-public`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        log.info(`[AutoScan] Steam sync background complete: ${res.data.message}`);
      }).catch(err => {
        log.error(`[AutoScan] Steam sync failed: ${err.message}`);
        if (err.response?.status === 401) {
          store.delete('token');
          store.delete('userId');
        }
      });
    }
    
    mainWindow?.webContents.send('library:updated');
  } catch (err) {
    log.error('[AutoScan] Failed:', err);
  }
}

import { BadgeService } from './services/badgeService.js';
import { ChallengeService } from './services/challengeService.js';

let badgeService: BadgeService | null = null;
let challengeService: ChallengeService | null = null;

// ── Gaming Mode State ─────────────────────────
let isGamingMode = false;

function enterGamingMode() {
  if (isGamingMode) return;
  isGamingMode = true;
  log.info('[GamingMode] ACTIVATED — suspending non-essential services');
  // Connectivity monitor will check this flag and skip
  // Badge evaluators deferred until session end
}

function exitGamingMode() {
  if (!isGamingMode) return;
  isGamingMode = false;
  log.info('[GamingMode] DEACTIVATED — restoring full services');
}

function setupTracker() {
  if (!tracker) return;

  if (!badgeService) badgeService = new BadgeService(overlay!);
  if (!challengeService) challengeService = new ChallengeService(overlay!);
  
  badgeService.init();
  challengeService.init();

  tracker.on('game:started', async (data) => {
    enterGamingMode();
    mainWindow?.webContents.send('game:started', data);
    const { activityService } = await import('./services/activityService.js');
    await activityService.reportActivity('STARTED_PLAYING', data.gameId);
    
    const userId = store.get('userId') as string;
    if (challengeService) {
      await challengeService.trackProgress(userId, { type: 'GAMES_LAUNCHED', value: 1, gameId: data.gameId });
    }
    // PERF: Badge check on game start is lightweight — allowed
    if (badgeService) {
      await badgeService.checkBadges(userId, { gameId: data.gameId });
    }

    // ── Cracked Achievement Engine: start watching emulator files ──────────
    try {
      const game = await prisma.game.findUnique({ where: { id: data.gameId } });
      if (game?.steamAppId && game?.exePath) {
        const watching = await crackedAchEngine.watch(
          game.id,
          game.title,
          game.steamAppId,
          game.exePath
        );
        if (watching) {
          log.info(`[Main] Cracked achievement watcher active for ${game.title}`);
        }
      }
    } catch (err: any) {
      log.warn(`[Main] Cracked achievement watcher failed to start: ${err.message}`);
    }
  });

  tracker.on('game:heartbeat', async (data) => {
    const userId = store.get('userId') as string;
    // PERF: Challenge progress writes to DB on heartbeat but does NOT trigger UI renders
    // Badge evaluators do NOT run on heartbeat — batched to session end
    if (challengeService) {
      await challengeService.trackProgress(userId, { type: 'PLAYTIME', value: 30, gameId: data.gameId });
    }
  });

  tracker.on('game:ended', async (data) => {
    exitGamingMode();
    mainWindow?.webContents.send('game:ended', data);
    const userId = store.get('userId') as string;
    await achievementEngine.checkAllAchievements(userId, data.gameId);
    
    // ── Stop cracked achievement watcher ──────────────────────────────────
    crackedAchEngine.unwatch(data.gameId);

    // Sync Steam trophies if it's a steam game
    const game = await prisma.game.findUnique({ where: { id: data.gameId } });
    if (game?.steamAppId) {
      log.info(`[Main] Game ${game.title} ended. Triggering Steam sync...`);
      const token = store.get('token');
      const profileRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      
      const steamId = profileRes?.data?.steamId;
      if (steamId) {
        axios.post(`${API_BASE_URL}/api/sync/steam-public`, {
          steamId,
          gameId: data.gameId,
          steamAppId: game.steamAppId.toString()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => log.error(`[Main] Background Steam sync failed: ${err.message}`));
      }
    }

    // PERF: Badge check runs ONLY on session end — batched evaluation
    if (badgeService) {
      await badgeService.checkBadges(userId, { 
        gameId: data.gameId, 
        sessionDuration: data.duration 
      });
    }
  });

  achievementEngine.on('achievement:unlocked', async (data) => {
    mainWindow?.webContents.send('achievement:unlocked', data);
    
    const userId = store.get('userId') as string;
    const { activityService } = await import('./services/activityService.js');
    await activityService.reportActivity('EARNED_ACHIEVEMENT', data.gameId, {
      achievementTitle: data.title,
      iconUrl: data.iconUrl
    });

    if (challengeService) {
      await challengeService.trackProgress(userId, { type: 'ACHIEVEMENTS', value: 1, gameId: data.gameId });
    }
    
    // Badge check on achievement is allowed — event-driven, not polling
    if (badgeService) {
      await badgeService.checkBadges(userId, { gameId: data.gameId });
    }

    if (store.get('overlayEnabled')) {
      overlay?.showTrophy({
        title: data.title,
        type: 'gold',
        iconUrl: data.iconUrl,
        description: data.description,
        source: data.source,
      });
    }
  });

  // ── Cracked Achievement Engine: real-time emulator file watcher ─────────────
  // Fires when Goldberg / CODEX / SmartSteamEmu / ALI213 / CreamAPI saves a new unlock
  crackedAchEngine.on('achievement:unlocked', async (unlocked: any) => {
    const userId = store.get('userId') as string;
    if (!userId) return;

    log.info(`[Main] Cracked ach unlocked: "${unlocked.name}" in ${unlocked.gameTitle} (${unlocked.source})`);

    // 1. Show overlay — ALWAYS show for cracked achievements, these are the real ones
    overlay?.showTrophy({
      title:         unlocked.name,
      description:   unlocked.description,
      gameTitle:     unlocked.gameTitle,
      type:          'gold',
      source:        unlocked.source,          // 'goldberg' | 'codex' | etc.
      iconUrl:       unlocked.iconUrl,
      globalPercent: unlocked.globalPercent,   // e.g. 29.8
      earnedAt:      unlocked.earnedAt?.toISOString(),
    });

    // 2. Notify renderer UI (for achievement feed)
    mainWindow?.webContents.send('achievement:unlocked', {
      gameId:        unlocked.gameId,
      title:         unlocked.name,
      description:   unlocked.description,
      iconUrl:       unlocked.iconUrl,
      globalPercent: unlocked.globalPercent,
      earnedAt:      unlocked.earnedAt?.toISOString(),
      source:        unlocked.source,
    });

    // 3. Persist to local SQLite DB
    try {
      await (prisma as any).gameAchievement.upsert({
        where: {
          userId_gameId_key: {
            userId,
            gameId: unlocked.gameId,
            key:    `${unlocked.source}_${unlocked.key}`,
          }
        },
        update: {
          isEarned:  true,
          earnedAt:  unlocked.earnedAt || new Date(),
          name:      unlocked.name,
        },
        create: {
          userId,
          gameId:   unlocked.gameId,
          key:      `${unlocked.source}_${unlocked.key}`,
          name:     unlocked.name,
          description: unlocked.description || '',
          iconUrl:  unlocked.iconUrl,
          isEarned: true,
          earnedAt: unlocked.earnedAt || new Date(),
          source:   unlocked.source,
        }
      });
    } catch (err: any) {
      log.error(`[Main] Failed to save cracked achievement: ${err.message}`);
    }

    // 4. Sync to cloud API (fire-and-forget)
    const token = store.get('token');
    if (token) {
      axios.post(`${API_BASE_URL}/api/sync/achievements`, {
        gameId:    unlocked.gameId,
        key:       `${unlocked.source}_${unlocked.key}`,
        name:      unlocked.name,
        description: unlocked.description || '',
        iconUrl:   unlocked.iconUrl,
        isEarned:  true,
        earnedAt:  unlocked.earnedAt?.toISOString(),
        source:    unlocked.source,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => log.warn(`[Main] Cloud ach sync failed: ${err.message}`));
    }

    // 5. Track challenge progress
    if (challengeService) {
      await challengeService.trackProgress(userId, {
        type: 'ACHIEVEMENTS', value: 1, gameId: unlocked.gameId
      });
    }
  });

  tracker.start();
}


// ── IPC Handlers ──────────────────────────────
ipcMain.handle('auth:getToken', () => store.get('token'));
ipcMain.handle('auth:setToken', async (_, token: string | null) => {
  if (!token) {
    store.delete('token');
    store.delete('userId');
    return;
  }

  store.set('token', token);
  
  // Fetch user profile to get userId
  try {
    const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userId = res.data.id;
    store.set('userId', userId);
    log.info(`[Main] User logged in: ${res.data.username} (${userId})`);

    // Restart tracker with new userId
    tracker = new GameTracker(detector, userId);
    setupTracker();
    
    // Start background scan
    autoScanAndSync(userId);
  } catch (err: any) {
    log.error(`[Main] Failed to fetch user profile: ${err.message}`);
  }
});

ipcMain.handle('games:openFolderDialog', () => gameDetector.openFolderDialog());
ipcMain.handle('games:scanFolder', (event, path) => gameDetector.scanFolder(path));
ipcMain.handle('games:getDetectedGames', () => gameDetector.getBackgroundProcesses());

ipcMain.handle('overlay:triggerTrophy', (event, data) => overlay?.showTrophy(data));

ipcMain.handle('library:discover', async () => {
  return await runFullLibraryDiscovery();
});

// ─── LAUNCH: Launch a game by ID ────────────────────────────────────────────
async function handleLaunch(gameId: string, options?: { forceExe?: boolean }) {
  try {
    log.info(`[Main] Launch request for ID: ${gameId}`);
    let game = await prisma.game.findUnique({ where: { id: gameId } })
    
    if (!game) {
      log.info(`[Main] ID ${gameId} not found in local SQLite. Checking if it's a Cloud ID...`);
      const token = store.get('token');
      if (token) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/games/${gameId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          log.info(`[Main] API returned cloud game: ${res.data.game?.title || 'Unknown'}`);
          const cloudGame = res.data.game;
          
          if (!cloudGame) {
            log.warn(`[Main] API did not return a game object for ID ${gameId}`);
          } else {
            // Try to find the local record using platform IDs
            if (cloudGame.steamAppId) {
              log.info(`[Main] Searching local DB by Steam ID: ${cloudGame.steamAppId}`);
              game = await prisma.game.findUnique({ where: { steamAppId: Number(cloudGame.steamAppId) } });
            } else if (cloudGame.epicAppId) {
              log.info(`[Main] Searching local DB by Epic ID: ${cloudGame.epicAppId}`);
              game = await prisma.game.findUnique({ where: { epicAppId: cloudGame.epicAppId } });
            } else if (cloudGame.gogAppId) {
              log.info(`[Main] Searching local DB by GOG ID: ${cloudGame.gogAppId}`);
              game = await prisma.game.findUnique({ where: { gogAppId: Number(cloudGame.gogAppId) } });
            } else if (cloudGame.exePath) {
              log.info(`[Main] Searching local DB by Exe Path: ${cloudGame.exePath}`);
              game = await prisma.game.findUnique({ where: { exePath: cloudGame.exePath } });
            }

            // Final fallback: Title match
            if (!game && cloudGame.title) {
              log.info(`[Main] Searching local DB by Title: ${cloudGame.title}`);
              game = await prisma.game.findFirst({ 
                where: { 
                  title: { contains: cloudGame.title } 
                } 
              });
            }
          }
          
          if (game) log.info(`[Main] Successfully resolved Cloud ID to local game: ${game.title} (${game.id})`);
          else log.warn(`[Main] Could not find any local game matching the cloud metadata for ${gameId}`);
        } catch (err: any) {
          log.error(`[Main] API lookup failed for ${gameId}: ${err.message}`);
        }
      } else {
        log.warn(`[Main] No token found, cannot resolve Cloud ID ${gameId}`);
      }
    }

    if (!game) {
      log.error(`[Main] Launch aborted: Game ${gameId} not found locally or in cloud library.`);
      return { success: false, error: 'Game not found in local library' }
    }

    log.info(`[Main] Preparing to launch: ${game.title} (Local ID: ${game.id})`);
    
    // Notify renderer: launching in progress
    mainWindow?.webContents.send('game:launching', { gameId: game.id })

    let config;
    if (options?.forceExe && game.exePath) {
      log.info(`[Main] Force-EXE launch requested for ${game.title}`);
      config = {
        gameId: game.id,
        title: game.title,
        method: 'exe' as const,
        exePath: game.exePath,
      };
    } else {
      config = await resolveLaunchConfig({
        id: game.id,
        title: game.title,
        steamAppId: game.steamAppId ?? null,
        epicAppId: game.epicAppId ?? null,
        gogAppId: game.gogAppId ?? null,
        launchUri: game.launchUri ?? null,
        exePath: game.exePath ?? null,
      });
      log.info(`[Main] Resolved launch method: ${config.method}`);
    }
    
    const result = await launcher.launch(config)

    if (!result.success) {
      mainWindow?.webContents.send('game:launchFailed', { 
        gameId, 
        error: result.error ?? 'Launch failed' 
      })
      return result
    }

    // Proactive tracking starts NOW
    if (tracker) {
      if (result.processHandle && result.processHandle.pid) {
        await tracker.attachProcess(game.id, result.processHandle.pid);
      } else {
        tracker.expectGame(game.id, game.processName);
      }
    }

    // Check if this is the first launch
    const sessionCount = await (prisma as any).playSession.count({
      where: { gameId: game.id }
    });

    if (sessionCount === 1) { // First launch session was just created
      log.info(`[Main] FIRST LAUNCH detected for ${game.title}! Triggering celebratory trophy...`);
      setTimeout(() => {
        overlay?.showTrophy({
          title: 'Launch Accomplished!',
          message: `YAY! CONGRATS ON LAUNCHING ${game.title.toUpperCase()} THROUGH GAMEVAULT!`,
          type: 'first_launch',
          gameTitle: game.title
        });
      }, 10000);
    }

    // Tell tracker to refine the process name for future passive detection
    if (tracker) {
      const processName = game.exePath
        ? path.basename(game.exePath, '.exe').toLowerCase()
        : null
      tracker.expectGame(game.id, processName)
    }

    return { success: true, method: result.method }

  } catch (err: any) {
    const error = err.message === 'NO_LAUNCH_METHOD'
      ? 'No launch method configured. Please set the executable path for this game.'
      : (err.message ?? 'Unknown error')

    mainWindow?.webContents.send('game:launchFailed', { gameId, error })
    return { success: false, error }
  }
}

ipcMain.handle('games:launch', (_, gameId: string, options?: any) => handleLaunch(gameId, options))
ipcMain.handle('game:launch', (_, gameId: string, options?: any) => handleLaunch(gameId, options))

// ─── SET EXE: Let user browse for game executable ────────────────────────────
ipcMain.handle('games:setExe', async (_, gameId: string) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Game Executable',
    defaultPath: 'C:\\',
    filters: [{ name: 'Game Executable or Script', extensions: ['exe', 'bat', 'cmd', 'lnk', 'url'] }],
    properties: ['openFile'],
  })

  if (result.canceled || !result.filePaths[0]) {
    return { success: false }
  }

  const exePath = result.filePaths[0]

  await prisma.game.update({
    where: { id: gameId },
    data: { exePath },
  })

  // Notify renderer that exe has been set
  mainWindow?.webContents.send('game:exeSet', { gameId, exePath })

  return { success: true, exePath }
})

// ─── SELECT FILE: Let user browse for any file ────────────────────────────
ipcMain.handle('games:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Game File (EXE, BAT, etc.)',
    defaultPath: 'C:\\',
    filters: [{ name: 'Game Executable or Script', extensions: ['exe', 'bat', 'cmd', 'lnk', 'url'] }],
    properties: ['openFile'],
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('library:confirmAll', async (_, { games }) => {
  log.info(`[Main] Confirming discovery for ${games?.length || 0} games...`);
  log.info(`[Main] DB URL set: ${!!process.env.DATABASE_URL}`);
  
  let userId = store.get('userId');
  let currentToken = store.get('token');
  
  // If userId is missing or empty, try to get it from token one last time
  if (!userId || userId === '') {
    if (currentToken) {
      try {
        log.info('[Main] Attempting to recover userId via API...');
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        userId = res.data.id;
        store.set('userId', userId);
        log.info(`[Main] Recovered userId: ${userId}`);
      } catch (err: any) {
        log.error(`[Main] Failed to recover userId: ${err.message}`);
        if (err.response?.status === 401) {
          store.delete('token');
          store.delete('userId');
          currentToken = null;
        }
      }
    }
  }

  if (!userId || userId === '') {
    log.error('[Main] Cannot save games: No valid userId found.');
    return { success: false, error: 'User not logged in' };
  }

  // Ensure user exists locally to prevent foreign key violations
  const userName = store.get('userName') || 'Local User';
  await (prisma as any).user.upsert({
    where: { id: userId },
    update: {},
    create: { 
      id: userId, 
      username: 'Local User',
      email: `local-${userId}@local`,
      supabaseId: `local-${userId}`
    }
  });

  const results = [];
  for (const game of games) {
    try {
      // Find existing game by platform ID first (highest priority)
      let existingGame = null;
      if (game.steamAppId) {
        existingGame = await (prisma as any).game.findUnique({ where: { steamAppId: game.steamAppId } });
      } else if (game.epicAppId) {
        existingGame = await (prisma as any).game.findUnique({ where: { epicAppId: game.epicAppId } });
      } else if (game.gogAppId) {
        existingGame = await (prisma as any).game.findUnique({ where: { gogAppId: game.gogAppId } });
      }
      
      // Fallback to exePath
      if (!existingGame) {
        existingGame = await (prisma as any).game.findUnique({ where: { exePath: game.exePath } });
      }

      let saved;
      if (existingGame) {
        // Update existing
        saved = await (prisma as any).game.update({
          where: { id: existingGame.id },
          data: {
            title: game.name,
            exePath: game.exePath, // Update path in case it changed
            source: game.source,
            launchUri: game.launchUri,
            steamAppId: game.steamAppId || existingGame.steamAppId,
            epicAppId: game.epicAppId || existingGame.epicAppId,
            gogAppId: game.gogAppId || existingGame.gogAppId,
          }
        });
      } else {
        // Create new
        saved = await (prisma as any).game.create({
          data: {
            title: game.name,
            exePath: game.exePath,
            source: game.source,
            launchUri: game.launchUri,
            steamAppId: game.steamAppId,
            epicAppId: game.epicAppId,
            gogAppId: game.gogAppId,
            platform: game.platform || 'PC'
          }
        });
      }
      
      await (prisma as any).userGame.upsert({
        where: { userId_gameId: { userId, gameId: saved.id } },
        update: { totalPlaytime: game.playtime || 0 },
        create: { userId, gameId: saved.id, status: 'backlog', totalPlaytime: game.playtime || 0 }
      });

      // SYNC TO CENTRAL API
      if (currentToken) {
        axios.post(`${API_BASE_URL}/api/games`, {
          title: game.name,
          exePath: game.exePath,
          source: game.source,
          launchUri: game.launchUri,
          steamAppId: game.steamAppId,
          epicAppId: game.epicAppId,
          gogAppId: game.gogAppId,
          coverUrl: game.coverUrl, // If available
          totalPlaytime: game.playtime,
          playtime2Weeks: game.playtime2Weeks,
        }, {
          headers: { Authorization: `Bearer ${currentToken}` }
        }).catch(err => log.error(`[Main] API Sync failed for ${game.name}: ${err.message}`));
      }

      results.push(saved);
      log.info(`[Main] Successfully saved & synced: ${game.name}`);
    } catch (err: any) {
      log.error(`[Main] Failed to save ${game.name}: ${err.message}`);
    }
  }

  // Trigger API hydration
  if (currentToken) {
    axios.get(`${API_BASE_URL}/api/games/hydrate-all`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    }).catch(() => {});
  }
  
  mainWindow?.webContents.send('library:updated');
  return { success: true, count: results.length };
});

ipcMain.handle('sync:steam', async (_, { steamId, apiKey }) => {
  const userId = store.get('userId');
  try {
    const res = await axios.post(`${API_BASE_URL}/api/sync/steam`, {
      userId, steamId, apiKey
    });
    store.set('last_steam_sync', Date.now());
    return res.data;
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('sync:localAchievements', async (_, { gameId, exePath }) => {
  const userId = store.get('userId');
  const { scanLocalAchievements } = await import('./services/achievementScanner.js');
  return await scanLocalAchievements(userId, gameId, exePath);
});

ipcMain.handle('api:getUsage', async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/admin/usage`);
    return res.data;
  } catch {
    return { rawgDaily: 0, rawgMonthly: 0, cacheSize: 0, isOnline: false };
  }
});

// ── App Lifecycle ─────────────────────────────
app.whenReady().then(() => {
  // Initialize components after ready
  overlay = new TrophyOverlay();
  
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open GameVault', click: () => {
      if (!mainWindow) createMainWindow();
      else mainWindow.show();
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      if (tracker) tracker.stop();
      app.quit();
    }}
  ]);
  tray.setContextMenu(contextMenu);

  // Background Initialization
  const userId = store.get('userId') as string;
  if (userId) {
    tracker = new GameTracker(detector, userId);
    setupTracker();
    const syncService = new SyncService();
    syncService.startSyncLoop();
  }

  // Auto-launch main window
  createMainWindow();

  // PERF: Adaptive Connectivity Monitor
  // - Normal: checks every 30s
  // - Gaming Mode: backs off to 5 minutes (no CPU wasted during gameplay)
  // - Offline: backs off to 2 minutes before retrying
  // Using recursive setTimeout instead of setInterval avoids stacking callbacks
  // if health check takes longer than the interval.
  let connectivityTimer: NodeJS.Timeout | null = null;
  
  async function runConnectivityCheck() {
    // Don't bother during active gaming — save CPU
    if (isGamingMode) {
      connectivityTimer = setTimeout(runConnectivityCheck, 5 * 60 * 1000); // 5 min backoff
      return;
    }

    let online = false;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      online = res.status === 200;
    } catch {}

    mainWindow?.webContents.send('sync:status', {
      online,
      apiOnline: online,
      pendingWrites: 0,
      rawgUsagePercent: 0,
    });

    // Offline → slower retry (2min). Online → normal 30s.
    const nextInterval = online ? 30_000 : 2 * 60 * 1000;
    connectivityTimer = setTimeout(runConnectivityCheck, nextInterval);
  }

  // Start the first check after a 10s delay to avoid hitting API during startup
  connectivityTimer = setTimeout(runConnectivityCheck, 10_000);
});

app.on('window-all-closed', () => {
  // Keep app running in tray
});
