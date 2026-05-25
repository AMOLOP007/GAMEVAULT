import 'dotenv/config';
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, dialog } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
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

// PERF (P8): Pre-import heavy modules to avoid latency in hot paths
import { forensicSyncService } from './services/forensicSyncService.js';
import { scanOnStartup, formatNotificationStrategy } from './achievements/StartupScanner.js';
import { hasValidSession } from './achievements/SessionValidator.js';
import { activityService } from './services/activityService.js';
import { scanLocalAchievements } from './services/achievementScanner.js';

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
let syncService: SyncService | null = null;

// PERF (P7): Session-scoped scan cache — prevents redundant full library discovery
let lastScanTimestamp = 0;
const SCAN_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

// ── 100% Completion Helper ─────────────────────────
async function checkAndTrigger100Percent(userId: string, gameId: string, gameTitle: string) {
  try {
    const earned = await (prisma as any).gameAchievement.count({ where: { userId, gameId, isEarned: true } });
    const total = await (prisma as any).achievement.count({ where: { gameId } });
    
    if (total > 0 && earned >= total) {
      const ug = await (prisma as any).userGame.findUnique({ where: { userId_gameId: { userId, gameId } } });
      if (ug && !ug.is100Percent) {
        await (prisma as any).userGame.update({
          where: { userId_gameId: { userId, gameId } },
          data: { is100Percent: true }
        });
        
        log.info(`[Main] 100% COMPLETION DETECTED for ${gameTitle}! Triggering grand master trophy...`);
        // Wait for the individual achievement overlay to finish before showing the 100% overlay
        setTimeout(() => {
          overlay?.showTrophy({
            title: '100% Completed!',
            description: `You've unlocked every achievement in ${gameTitle}. You are a true Grand Master!`,
            type: 'grand_master',
            gameTitle: gameTitle
          });
        }, 7000); 
      }
    }
  } catch (err: any) {
    log.error(`[Main] Failed to check 100% completion: ${err.message}`);
  }
}

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

  // SECURITY: Content Security Policy — restrict sources strictly
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // In dev, allow localhost; in production, only allow our known domains
    const csp = isDev
      ? "default-src 'self' http://localhost:* https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:; connect-src 'self' http://localhost:* https:"
      : "default-src 'self' https://gamevault-web-lejg.vercel.app https://gamevault-j05d.onrender.com; script-src 'self' 'unsafe-inline' https://gamevault-web-lejg.vercel.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:; connect-src 'self' https://gamevault-web-lejg.vercel.app https://gamevault-j05d.onrender.com https://store.steampowered.com https://steamcommunity.com https://api.steampowered.com";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  mainWindow.setMenuBarVisibility(false);

  // SECURITY: Block navigation to unknown URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = [WEB_BASE_URL, 'about:blank'];
    if (!allowed.some(a => url.startsWith(a))) {
      log.warn(`[Security] Blocked navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // SECURITY: Block window.open (prevents external window exploits)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log.warn(`[Security] Blocked window.open to: ${url}`);
    return { action: 'deny' };
  });

  // SECURITY: Block webview tag
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

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

let isAutoScanning = false;
async function autoScanAndSync(userId: string) {
  if (isAutoScanning) {
    log.info('[AutoScan] Scan already in progress, skipping duplicate request.');
    return;
  }

  // PERF (P7): Skip if we already scanned recently this session
  const now = Date.now();
  if (now - lastScanTimestamp < SCAN_CACHE_TTL_MS) {
    log.info(`[AutoScan] Skipping — last scan was ${Math.round((now - lastScanTimestamp) / 1000)}s ago (cache TTL: ${SCAN_CACHE_TTL_MS / 1000}s)`);
    return;
  }

  isAutoScanning = true;
  lastScanTimestamp = now;
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
        forensicSyncService.syncGame(game.steamAppId.toString(), g.id).catch(() => { });
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
        }).catch(() => { });
      }
    }
    log.info('[AutoScan] Sync complete');

    // ── BACKGROUND STEAM SYNC ──────────────────
    const currentToken = store.get('token');
    if (currentToken) {
      log.info('[AutoScan] Triggering background Steam sync...');
      axios.post(`${API_BASE_URL}/api/sync/steam-all-public`, {}, {
        headers: { Authorization: `Bearer ${currentToken}` }
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

    // Trigger background offline achievement scan (Optimization: delayed start)
    setTimeout(async () => {
      try {
        const games = await (prisma as any).game.findMany({
          where: { steamAppId: { not: null }, exePath: { not: null } }
        });

        const watchedGames = games.map((g: any) => ({
          gameId: g.id,
          title: g.title,
          steamAppId: g.steamAppId!,
          exePath: g.exePath!
        }));

        log.info('[AutoScan] Triggering background startup achievement scan...');
        const report = await scanOnStartup(watchedGames, prisma, userId);
        const strategy = formatNotificationStrategy(report);

        if (strategy.items.length > 0) {
          log.info(`[AutoScan] Detected missed achievements. Mode: ${strategy.mode}`);

          if (strategy.mode === 'sequential') {
            strategy.items.forEach((item, index) => {
              setTimeout(() => {
                mainWindow?.webContents.send('achievement:unlocked', {
                  gameId: item.gameId,
                  title: item.achievementId,
                  gameTitle: item.gameName,
                });
              }, index * 3000);
            });
          } else if (strategy.mode === 'grouped') {
            mainWindow?.webContents.send('achievements:offlineDetected', strategy.items);
          } else if (strategy.mode === 'summary') {
            mainWindow?.webContents.send('achievements:offlineDetected', [{
              summary: true,
              count: strategy.items.length,
              message: `You earned ${strategy.items.length} achievements while offline.`
            }]);
          }
        }
      } catch (err: any) {
        log.error(`[AutoScan] Missed achievement scan failed: ${err.message}`);
      }
    }, 8000);
  } catch (err) {
    log.error('[AutoScan] Failed:', err);
  } finally {
    isAutoScanning = false;
  }
}

// Prevents re-scanning the same game twice in one app session
const sessionScannedGames = new Set<string>();

async function scanGameAchievementsOnce(gameId: string, userId: string): Promise<void> {
  if (sessionScannedGames.has(gameId)) return;
  sessionScannedGames.add(gameId);

  try {
    // SESSION GATE: Must have at least one tracked GameVault session
    if (!gameId) return;
    const hasSession = await hasValidSession(gameId, userId);
    if (!hasSession) {
      log.info(`[LazyAchScan] No GameVault session for game ${gameId}. Skipping offline scan.`);
      return;
    }

    const offlineAchs = await crackedAchEngine.scanForOfflineAchievements(userId, gameId);
    if (offlineAchs.length === 0) return;

    log.info(`[LazyAchScan] Found ${offlineAchs.length} offline achievements for game ${gameId}`);

    // Silent bulk DB save — no popup for already-earned achievements
    for (const ach of offlineAchs) {
      try {
        await (prisma as any).gameAchievement.upsert({
          where: {
            userId_gameId_key: {
              userId,
              gameId: ach.gameId,
              key: `${ach.source}_${ach.key}`,
            },
          },
          update: {},
          create: {
            userId,
            gameId: ach.gameId,
            key: `${ach.source}_${ach.key}`,
            name: ach.name,
            description: ach.description || '',
            iconUrl: ach.iconUrl,
            isEarned: true,
            earnedAt: ach.earnedAt || new Date(),
            source: ach.source,
          },
        });
      } catch (dbErr: any) {
        log.warn(`[LazyAchScan] DB upsert failed for ${ach.key}: ${dbErr.message}`);
      }
    }

    // One summary notification to the renderer — NOT 50 individual ones
    mainWindow?.webContents.send('achievements:offlineDetected', offlineAchs);

  } catch (err: any) {
    log.warn(`[LazyAchScan] Scan failed for game ${gameId}: ${err.message}`);
    sessionScannedGames.delete(gameId);
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
  syncService?.pauseSync();
  // Connectivity monitor will check this flag and skip
  // Badge evaluators deferred until session end
}

function exitGamingMode() {
  if (!isGamingMode) return;
  isGamingMode = false;
  log.info('[GamingMode] DEACTIVATED — restoring full services');
  syncService?.resumeSync();
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
    activityService.logActivity('STARTED_PLAYING', data.gameId).catch(err => log.error('Failed to log activity:', err));

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

    // POST-SESSION RESCAN: Emulators that only flush on exit
    setTimeout(async () => {
      try {
        const newAchs = await crackedAchEngine.postSessionRescan(data.gameId);
        if (newAchs.length > 0) {
          log.info(`[Main] Post-session rescan found ${newAchs.length} new achievements for ${data.gameId}`);
        }
      } catch (err) {}
    }, 10000);

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
    activityService.logActivity('EARNED_ACHIEVEMENT', data.gameId, {
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
        inGame: true,
      });
    }

    await checkAndTrigger100Percent(userId, data.gameId, data.gameTitle || 'Game');
  });

  // ── Cracked Achievement Engine: real-time emulator file watcher ─────────────
  // Fires when Goldberg / CODEX / SmartSteamEmu / ALI213 / CreamAPI saves a new unlock
  crackedAchEngine.on('achievement:unlocked', async (unlocked: any) => {
    const userId = store.get('userId') as string;
    if (!userId) return;

    log.info(`[Main] Cracked ach unlocked: "${unlocked.name}" in ${unlocked.gameTitle} (${unlocked.source})`);

    // 1. Show overlay — ALWAYS show for cracked achievements, these are the real ones
    overlay?.showTrophy({
      title: unlocked.name,
      description: unlocked.description,
      gameTitle: unlocked.gameTitle,
      type: 'gold',
      source: unlocked.source,          // 'goldberg' | 'codex' | etc.
      iconUrl: unlocked.iconUrl,
      globalPercent: unlocked.globalPercent,   // e.g. 29.8
      earnedAt: unlocked.earnedAt?.toISOString(),
      inGame: true,
    });

    // 2. Notify renderer UI (for achievement feed)
    mainWindow?.webContents.send('achievement:unlocked', {
      gameId: unlocked.gameId,
      title: unlocked.name,
      description: unlocked.description,
      iconUrl: unlocked.iconUrl,
      globalPercent: unlocked.globalPercent,
      earnedAt: unlocked.earnedAt?.toISOString(),
      source: unlocked.source,
    });

    // 3. Persist to local SQLite DB
    try {
      await (prisma as any).gameAchievement.upsert({
        where: {
          userId_gameId_key: {
            userId,
            gameId: unlocked.gameId,
            key: `${unlocked.source}_${unlocked.key}`,
          }
        },
        update: {
          isEarned: true,
          earnedAt: unlocked.earnedAt || new Date(),
          name: unlocked.name,
        },
        create: {
          userId,
          gameId: unlocked.gameId,
          key: `${unlocked.source}_${unlocked.key}`,
          name: unlocked.name,
          description: unlocked.description || '',
          iconUrl: unlocked.iconUrl,
          isEarned: true,
          earnedAt: unlocked.earnedAt || new Date(),
          source: unlocked.source,
        }
      });
    } catch (err: any) {
      log.error(`[Main] Failed to save cracked achievement: ${err.message}`);
    }

    // 4. Sync to cloud API (fire-and-forget)
    const token = store.get('token');
    if (token) {
      axios.post(`${API_BASE_URL}/api/sync/achievements`, {
        gameId: unlocked.gameId,
        key: `${unlocked.source}_${unlocked.key}`,
        name: unlocked.name,
        description: unlocked.description || '',
        iconUrl: unlocked.iconUrl,
        isEarned: true,
        earnedAt: unlocked.earnedAt?.toISOString(),
        source: unlocked.source,
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

    await checkAndTrigger100Percent(userId, unlocked.gameId, unlocked.gameTitle || 'Game');
  });

  tracker.start();
}

// ── Auto Updater ──────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update:available', info);
});
autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update:downloaded', info);
});
autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update:error', err.message);
});

// ── IPC Handlers ──────────────────────────────
ipcMain.handle('app:checkForUpdates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, info: result?.updateInfo };
  } catch (err: any) {
    log.error(`Update check failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:installUpdate', () => {
  autoUpdater.quitAndInstall();
});
ipcMain.handle('playtime:currentSession', () => {
  return tracker?.currentSession ? {
    gameId: tracker.currentSession.gameId,
    duration: tracker.currentSession.duration,
    startTime: tracker.currentSession.startTime
  } : null;
});

ipcMain.handle('auth:getToken', () => store.get('token'));

ipcMain.handle('achievements:get', async (_, gameId: string, payload?: any) => {
  const userId = store.get('userId') as string;
  if (!userId) {
    log.warn('[Main] achievements:get called but userId is missing');
    return [];
  }
  
  try {
    let localGameId = gameId;
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    
    // Resolve mismatch between Postgres ID and SQLite ID
    if (!game && payload?.title) {
      game = await prisma.game.findFirst({
        where: { OR: [
          { steamAppId: payload.steamAppId ? Number(payload.steamAppId) : -1 },
          { title: payload.title }
        ]}
      });
      if (game) {
        localGameId = game.id;
      } else {
        // Create the game locally so foreign key constraints pass when saving scraped achievements
        game = await prisma.game.create({
          data: {
            id: localGameId, // Use the incoming Postgres ID
            title: payload.title,
            steamAppId: payload.steamAppId ? Number(payload.steamAppId) : null,
            source: 'sync',
            platform: 'PC'
          }
        });
      }
    }

    // 1. Get from local DB
    let achievements = await (prisma as any).gameAchievement.findMany({
      where: { userId, gameId: localGameId },
      orderBy: { key: 'asc' }
    });
    
    // 2. If empty or missing Steam achievements for a Steam game, fetch them
    let steamAppId = game?.steamAppId || payload?.steamAppId;
    const hasSteamAchs = achievements.some((a: any) => a.source === 'steam');
    
    if (achievements.length === 0 || (!hasSteamAchs && steamAppId)) {
      const gameTitle = game?.title || payload?.title;
      
      // Fallback: search Steam if missing AppID
      if (!steamAppId && gameTitle) {
        log.info(`[Main] Missing steamAppId for ${gameTitle}, searching Steam...`);
        try {
          const res = await axios.get(`https://store.steampowered.com/api/storesearch/`, {
            params: { term: gameTitle, l: 'english', cc: 'US' }
          });
          const apps = res.data.items;
          if (apps && apps.length > 0) {
            steamAppId = apps[0].id;
            await prisma.game.update({
              where: { id: gameId },
              data: { steamAppId }
            });
          }
        } catch (err: any) {
          log.warn(`[Main] Steam search failed: ${err.message}`);
        }
      }
      
      if (steamAppId) {
        log.info(`[Main] Fetching Steam achievements for AppID: ${steamAppId}`);
        const parsedAchievements: any[] = [];
        
        // ── Fetch Steam XML achievements (provides API names like ACH_01 needed for local sync) ──
        try {
          const url = `https://steamcommunity.com/stats/${steamAppId}/achievements/?xml=1`;
          const response = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          const xml = response.data as string;
          
          // Basic XML parsing with regex (fast and no extra dependency)
          const achBlocks = xml.split('<achievement>');
          achBlocks.shift(); // Remove header
          
          log.info(`[Main] XML scrape found ${achBlocks.length} achievement blocks`);
          
          for (const block of achBlocks) {
            const apiName = block.match(/<apiname><!\[CDATA\[(.*?)\]\]><\/apiname>/)?.[1] || 
                            block.match(/<apiname>(.*?)<\/apiname>/)?.[1];
            const displayName = block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] || 
                                block.match(/<name>(.*?)<\/name>/)?.[1];
            const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || 
                         block.match(/<description>(.*?)<\/description>/)?.[1];
            const icon = block.match(/<iconClosed><!\[CDATA\[(.*?)\]\]><\/iconClosed>/)?.[1] || 
                         block.match(/<iconClosed>(.*?)<\/iconClosed>/)?.[1];
            
            if (apiName && displayName) {
              parsedAchievements.push({
                userId,
                gameId: localGameId,
                key: apiName, // USE THE REAL API NAME (e.g. ACH_01 or 81001)
                name: displayName.trim(),
                description: desc?.trim() || '',
                iconUrl: icon || '',
                isEarned: false,
                source: 'steam'
              });
            }
          }
          if (parsedAchievements.length > 0) {
            log.info(`[Main] Parsed ${parsedAchievements.length} achievements from Steam XML`);
          }
        } catch (scrapeErr: any) {
          log.warn(`[Main] Steam XML fetch failed: ${scrapeErr.message}.`);
        }
        
        // ── Save to DB ──
        if (parsedAchievements.length > 0) {
          log.info(`[Main] Saving ${parsedAchievements.length} achievements to DB...`);
          for (const ach of parsedAchievements) {
            try {
              await (prisma as any).gameAchievement.upsert({
                where: { userId_gameId_key: { userId, gameId: localGameId, key: ach.key } },
                update: {},
                create: ach
              });
              await (prisma as any).achievement.upsert({
                where: { gameId_key: { gameId: localGameId, key: ach.key } },
                update: {},
                create: {
                  gameId: localGameId,
                  key: ach.key,
                  title: ach.name,
                  description: ach.description || '',
                  iconUrl: ach.iconUrl,
                  condition: 'steam_achievement',
                }
              });
            } catch (e: any) {
              // Skip individual save errors silently
            }
          }
          
          achievements = await (prisma as any).gameAchievement.findMany({
            where: { userId, gameId: localGameId },
            orderBy: { key: 'asc' }
          });
        }
      }
    }
    
    return achievements;
  } catch (err: any) {
    log.error(`[Main] Failed to get achievements: ${err.message}`);
    return [];
  }
});

ipcMain.handle('achievements:markDone', async (_, { gameId, key, name, description, iconUrl, title, steamAppId }) => {
  const userId = store.get('userId') as string;
  if (!userId) return { success: false, error: 'User not logged in' };
  
  try {
    let localGameId = gameId;
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    
    // Resolve mismatch between Postgres ID and SQLite ID
    if (!game && title) {
      game = await prisma.game.findFirst({
        where: { OR: [
          { steamAppId: steamAppId ? Number(steamAppId) : -1 },
          { title: title }
        ]}
      });
      if (game) localGameId = game.id;
    }

    const achievement = await (prisma as any).gameAchievement.upsert({
      where: {
        userId_gameId_key: {
          userId,
          gameId: localGameId,
          key
        }
      },
      update: {
        isEarned: true,
        earnedAt: new Date()
      },
      create: {
        userId,
        gameId: localGameId,
        key,
        name: name || 'Manually Unlocked',
        description: description || '',
        iconUrl: iconUrl || '',
        isEarned: true,
        earnedAt: new Date(),
        source: 'manual'
      }
    });
    
    // Notify renderer
    mainWindow?.webContents.send('achievement:unlocked', achievement);
    
    // Sync to API
    const token = store.get('token') as string | undefined;
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/sync/achievements`,
          {
            gameId: gameId,
            key: key,
            name: name || 'Manually Unlocked',
            description: description || '',
            iconUrl: iconUrl || '',
            isEarned: true,
            earnedAt: new Date().toISOString(),
            source: 'manual',
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        );
      } catch (apiErr: any) {
        log.warn(`[Main] API sync failed for markDone: ${apiErr.message}`);
      }
    }
    
    // Show overlay if enabled
    if (store.get('overlayEnabled')) {
      overlay?.showTrophy({
        title: achievement.name,
        description: achievement.description,
        type: 'gold',
        iconUrl: achievement.iconUrl,
        source: 'manual'
      });
    }
    
    // Also fetch game title for the 100% check
    const g = await (prisma as any).game.findUnique({ where: { id: gameId } });
    await checkAndTrigger100Percent(userId, gameId, g?.title || 'Game');

    return { success: true };
  } catch (err: any) {
    log.error(`[Main] Failed to mark achievement as done: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('achievements:confirmOffline', async (_, { achievements }) => {
  const userId = store.get('userId') as string;
  if (!userId) return { success: false };

  log.info(`[Main] Processing ${achievements.length} offline achievements...`);

  const POPUP_THRESHOLD = 3;
  const shouldShowPopups = achievements.length <= POPUP_THRESHOLD;

  for (const ach of achievements) {
    try {
      await (prisma as any).gameAchievement.upsert({
        where: {
          userId_gameId_key: {
            userId,
            gameId: ach.gameId,
            key: `${ach.source}_${ach.key}`,
          }
        },
        update: {
          isEarned: true,
          earnedAt: ach.earnedAt || new Date(),
          name: ach.name,
        },
        create: {
          userId,
          gameId: ach.gameId,
          key: `${ach.source}_${ach.key}`,
          name: ach.name,
          description: ach.description || '',
          iconUrl: ach.iconUrl,
          isEarned: true,
          earnedAt: ach.earnedAt || new Date(),
          source: ach.source,
        }
      });
    } catch (err: any) {
      log.error(`[Main] Failed to save offline achievement to DB: ${err.message}`);
    }

    // ── Task 1: Cloud Sync ──────────────────────────────────────────────────
    const token = store.get('token') as string | undefined;
    if (token) {
      try {
        const apiRes = await axios.post(
          `${API_BASE_URL}/api/sync/achievements`,
          {
            gameId: ach.gameId,
            key: `${ach.source}_${ach.key}`,
            name: ach.name,
            description: ach.description || '',
            iconUrl: ach.iconUrl,
            isEarned: true,
            earnedAt: ach.earnedAt ? new Date(ach.earnedAt).toISOString() : new Date().toISOString(),
            source: ach.source,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        );
        if (apiRes.status < 200 || apiRes.status >= 300) {
          log.warn(`[AchSync] Non-2xx from API: ${apiRes.status}`);
        }
      } catch (apiErr: any) {
        log.warn(`[AchSync] API call failed (non-fatal): ${apiErr.message}`);
      }
    }

    // ── Task 3: Popup Suppressor ─────────────────────────────────────────────
    if (shouldShowPopups) {
      if (store.get('overlayEnabled')) {
        overlay?.showTrophy({
          title: ach.name,
          description: ach.description,
          gameTitle: ach.gameTitle,
          type: 'gold',
          source: ach.source,
          iconUrl: ach.iconUrl,
          globalPercent: ach.globalPercent,
          earnedAt: ach.earnedAt,
        });
      }

      mainWindow?.webContents.send('achievement:unlocked', ach);
      // Yield to make it satisfying (Optimization/Effect)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // If suppressed, send ONE summary event instead
  if (!shouldShowPopups) {
    mainWindow?.webContents.send('achievements:bulkUnlocked', {
      count: achievements.length,
      gameId: achievements[0]?.gameId,
      gameName: achievements[0]?.gameName || achievements[0]?.gameTitle,
    });
  }

  return { success: true };
});
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

    // Ensure user exists locally to prevent foreign key violations
    try {
      await (prisma as any).user.upsert({
        where: { id: userId },
        update: { username: res.data.username, email: res.data.email },
        create: {
          id: userId,
          username: res.data.username,
          email: res.data.email,
          supabaseId: res.data.supabaseId || `local-${userId}`
        }
      });
    } catch (err: any) {
      log.error(`[Main] Failed to upsert user locally: ${err.message}`);
    }

    // Check if new user (no badges earned yet)
    try {
      const badgeCount = await (prisma as any).userBadge.count({ where: { userId } });
      if (badgeCount === 0) {
        log.info(`[Main] New user detected: ${userId}. Awarding welcome badge.`);
        await (prisma as any).userBadge.create({
          data: {
            userId,
            badgeId: 'welcome_vault',
            unlockedAt: new Date()
          }
        });

        // Sync to cloud
        const token = store.get('token') as string;
        if (token) {
          try {
            await axios.post(`${API_BASE_URL}/api/badges`, 
              { badgeId: 'welcome_vault' },
              { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
            );
          } catch (apiErr: any) {
            log.warn(`[Main] API sync failed for welcome badge: ${apiErr.message}`);
          }
        }

        overlay?.showTrophy({
          title: 'Welcome to GameVault!',
          description: 'You have taken your first step into the ultimate gaming vault.',
          type: 'new_user_welcome',
          source: 'first_launch'
        });
      }
    } catch (err: any) {
      log.error(`[Main] Failed to check/award welcome badge: ${err.message}`);
    }

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
  const userId = store.get('userId') as string;
  if (userId && gameId) {
    // Fire-and-forget — do not await, do not block game launch
    scanGameAchievementsOnce(gameId, userId).catch(err =>
      log.warn(`[LazyAchScan] Unhandled error: ${err.message}`)
    );
  }

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
        source: game.source,
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

  let targetGameId = gameId;
  let gameTitle = 'Unknown Game';
  const game = await prisma.game.findUnique({ where: { id: gameId } });

  if (game) {
    gameTitle = game.title;
  } else {
    log.info(`[Main] ID ${gameId} not found in local SQLite for setExe. Checking if it's a Cloud ID...`);
    const token = store.get('token');
    if (token) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const cloudGame = res.data.game;

        if (cloudGame) {
          gameTitle = cloudGame.title;
          let localGame = null;
          if (cloudGame.steamAppId) {
            localGame = await prisma.game.findUnique({ where: { steamAppId: Number(cloudGame.steamAppId) } });
          } else if (cloudGame.epicAppId) {
            localGame = await prisma.game.findUnique({ where: { epicAppId: cloudGame.epicAppId } });
          } else if (cloudGame.gogAppId) {
            localGame = await prisma.game.findUnique({ where: { gogAppId: Number(cloudGame.gogAppId) } });
          }

          if (localGame) {
            targetGameId = localGame.id;
            gameTitle = localGame.title;
            log.info(`[Main] Resolved Cloud ID ${gameId} to local game ID ${targetGameId} for setExe`);
          }
        }
      } catch (err: any) {
        log.warn(`[Main] Failed to resolve Cloud ID in setExe: ${err.message}`);
      }
    }
  }

  const existingLocal = await prisma.game.findUnique({ where: { id: targetGameId } });

  if (existingLocal) {
    await prisma.game.update({
      where: { id: targetGameId },
      data: { exePath },
    });
  } else {
    await prisma.game.create({
      data: {
        id: targetGameId,
        title: gameTitle,
        exePath,
        source: 'cloud'
      },
    });
  }

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
    }).catch(() => { });
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

ipcMain.handle('achievements:scan-local', async (_, gameId: string, exePath: string) => {
  try {
    const result = await scanLocalAchievements(store.get('userId') as string, gameId, exePath);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
    {
      label: 'Open GameVault', click: () => {
        if (!mainWindow) createMainWindow();
        else mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit', click: () => {
        if (tracker) tracker.stop();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  // Background Initialization
  const userId = store.get('userId') as string;
  if (userId) {
    tracker = new GameTracker(detector, userId);
    setupTracker();
    syncService = new SyncService();
    syncService.startSyncLoop();

    // Background Sweep (Every 6 hours)
    setInterval(async () => {
      if (isGamingMode) return;
      await crackedAchEngine.backgroundSweepAll(userId);
    }, 6 * 60 * 60 * 1000);
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
    // PERF (P2): Don't run connectivity checks when window is closed and no game active
    if (!mainWindow && !tracker?.currentSession) {
      connectivityTimer = null; // Will restart when window opens
      return;
    }

    // Don't bother during active gaming — save CPU
    if (isGamingMode) {
      connectivityTimer = setTimeout(runConnectivityCheck, 10 * 60 * 1000); // 10 min backoff
      return;
    }

    let online = false;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      online = res.status === 200;
    } catch { }

    mainWindow?.webContents.send('sync:status', {
      online,
      apiOnline: online,
      pendingWrites: 0,
      rawgUsagePercent: 0,
    });

    // Offline → slower retry (2min). Online → normal 60s.
    const nextInterval = online ? 60_000 : 2 * 60 * 1000;
    connectivityTimer = setTimeout(runConnectivityCheck, nextInterval);
  }

  // Start the first check after a 10s delay to avoid hitting API during startup
  connectivityTimer = setTimeout(runConnectivityCheck, 10_000);
});

app.on('window-all-closed', () => {
  // PERF (P2): Cancel connectivity timer when no windows are open (tray mode)
  if (connectivityTimer) {
    clearTimeout(connectivityTimer);
    connectivityTimer = null;
    log.info('[Main] Connectivity monitor paused (no windows open)');
  }
  // Keep app running in tray
});
