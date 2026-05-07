/**
 * CrackedAchievementEngine — Real-Time Achievement Detection for Cracked Games
 *
 * How it works:
 *   Detects which emulator/crack the game uses (Goldberg, CODEX, TENOKE, RUNE, Denuvo Bypass, etc.).
 *   It then maps the steamAppId to the emulator's save file or Steam's actual userdata folder.
 *   Definitions are pulled directly from GameVault's local Prisma Database, avoiding any need for Steam API Keys.
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import chokidar, { FSWatcher } from 'chokidar';
import fg from 'fast-glob';
import vdf from 'vdf-parser';
import prisma from '../db.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  iconUrl?: string;
  iconGrayUrl?: string;
  globalPercent?: number;
  isHidden?: boolean;
}

export interface UnlockedAchievement extends AchievementDefinition {
  earnedAt: Date;
  gameId: string;
  gameTitle: string;
  steamAppId: number;
  source: 'goldberg' | 'codex' | 'smartsteam' | 'ali213' | 'creamapi' | 'tenoke' | 'rune' | 'flt' | 'steam_offline' | 'generic';
}

interface EmulatorProfile {
  type: UnlockedAchievement['source'];
  saveFilePath: string;
  format: 'goldberg_json' | 'codex_ini' | 'generic_json' | 'steam_vdf';
}

interface WatchedGame {
  gameId: string;
  title: string;
  steamAppId: number;
  exePath: string;
  profile: EmulatorProfile;
  definitions: Map<string, AchievementDefinition>;
  lastState: Map<string, boolean>;          // key → isEarned (snapshot)
  watcher: FSWatcher | null;
  pollTimer: NodeJS.Timeout | null;
}

const POLL_INTERVAL_MS = 3000;

// ── Engine ────────────────────────────────────────────────────────────────────

export class CrackedAchievementEngine extends EventEmitter {
  private watching: Map<string, WatchedGame> = new Map();

  constructor() {
    super();
  }

  async watch(gameId: string, title: string, steamAppId: number, exePath: string): Promise<boolean> {
    if (this.watching.has(gameId)) return true;
    if (!steamAppId) return false;

    log.info(`[CrackedAch] Watching: ${title} (AppID: ${steamAppId})`);

    const installDir = path.dirname(exePath);

    // 1. Detect emulator profile
    const profile = await this.detectEmulator(steamAppId, installDir);
    if (!profile) {
      log.info(`[CrackedAch] No emulator save file found for ${title}`);
      return false;
    }

    log.info(`[CrackedAch] Detected emulator: ${profile.type} → ${profile.saveFilePath}`);

    // 2. Load achievement definitions from local SQLite DB
    const definitions = await this.loadDefinitions(gameId);
    if (definitions.size === 0) {
      log.warn(`[CrackedAch] No achievement definitions found locally for ${title}`);
      // We proceed even without definitions, so we can still track unlock keys.
    } else {
      log.info(`[CrackedAch] Loaded ${definitions.size} achievement definitions for ${title}`);
    }

    // 3. Take baseline snapshot
    const baseline = this.readSaveFile(profile);

    const game: WatchedGame = {
      gameId, title, steamAppId, exePath, profile,
      definitions,
      lastState: baseline,
      watcher: null,
      pollTimer: null,
    };

    this.watching.set(gameId, game);

    // 4. Start watching for changes
    this.startWatcher(game);
    return true;
  }

  unwatch(gameId: string) {
    const game = this.watching.get(gameId);
    if (!game) return;

    if (game.watcher) {
      game.watcher.close().catch(() => {});
      game.watcher = null;
    }
    if (game.pollTimer) {
      clearInterval(game.pollTimer);
      game.pollTimer = null;
    }

    this.watching.delete(gameId);
    log.info(`[CrackedAch] Stopped watching ${game.title}`);
  }

  unwatchAll() {
    for (const gameId of this.watching.keys()) {
      this.unwatch(gameId);
    }
  }

  // ── Emulator Detection ───────────────────────────────────────────────────────

  private async detectEmulator(steamAppId: number, installDir: string): Promise<EmulatorProfile | null> {
    const appdata    = process.env.APPDATA || '';
    const localAppdata = process.env.LOCALAPPDATA || '';
    const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    const publicDocs = path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Documents');
    const userProfile = process.env.USERPROFILE || '';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // 1. TENOKE
    const tenokePaths = [
      path.join(publicDocs, 'Steam', 'TENOKE', String(steamAppId), 'achievements.ini'),
      path.join(installDir, 'SteamData', 'user_stats.ini'),
      path.join(installDir, 'tenoke.ini'),
    ];
    for (const p of tenokePaths) {
      if (fs.existsSync(p)) return { type: 'tenoke', saveFilePath: p, format: 'codex_ini' };
    }

    // 2. RUNE
    const runePaths = [
      path.join(publicDocs, 'Steam', 'RUNE', String(steamAppId), 'achievements.ini'),
    ];
    for (const p of runePaths) {
      if (fs.existsSync(p)) return { type: 'rune', saveFilePath: p, format: 'codex_ini' };
    }

    // 3. FLT
    const fltPaths = [
      path.join(publicDocs, 'Steam', 'FLT', String(steamAppId), 'achievements.ini'),
      path.join(appdata, 'FLT', String(steamAppId), 'achievements.ini'),
    ];
    for (const p of fltPaths) {
      if (fs.existsSync(p)) return { type: 'flt', saveFilePath: p, format: 'codex_ini' };
    }

    // 4. Goldberg
    const goldbergPaths = [
      path.join(appdata,    'Goldberg SteamEmu Saves', String(steamAppId), 'achievements.json'),
      path.join(appdata,    'Goldberg SteamEmu Saves', String(steamAppId), 'stats', 'achievements.json'),
      path.join(localAppdata, 'Goldberg SteamEmu Saves', String(steamAppId), 'achievements.json'),
      path.join(userProfile, 'AppData', 'Roaming', 'Goldberg SteamEmu Saves', String(steamAppId), 'achievements.json'),
    ];
    for (const p of goldbergPaths) {
      if (fs.existsSync(p)) return { type: 'goldberg', saveFilePath: p, format: 'goldberg_json' };
    }

    // 5. CODEX / CPY
    const codexPaths = [
      path.join(programData, 'CODEX',   String(steamAppId), 'achievements.ini'),
      path.join(programData, 'CODEX',   String(steamAppId), 'stats', 'achievements.ini'),
      path.join(programData, 'Codex',   String(steamAppId), 'achievements.ini'),
      path.join(programData, 'CODEX',   String(steamAppId), 'achievements.json'),
    ];
    for (const p of codexPaths) {
      if (fs.existsSync(p)) {
        const fmt = p.endsWith('.ini') ? 'codex_ini' : 'goldberg_json';
        return { type: 'codex', saveFilePath: p, format: fmt };
      }
    }

    // 6. SmartSteamEmu
    const ssePaths = [
      path.join(appdata, 'SmartSteamEmu', String(steamAppId), 'stats', 'achievements.json'),
      path.join(appdata, 'SmartSteamEmu', String(steamAppId), 'achievements.json'),
    ];
    for (const p of ssePaths) {
      if (fs.existsSync(p)) return { type: 'smartsteam', saveFilePath: p, format: 'goldberg_json' };
    }

    // 7. ALI213
    const aliPaths = [
      path.join(programData, 'ALI213',  String(steamAppId), 'stats', 'UserAchievements.ini'),
      path.join(appdata,     'ALI213',  String(steamAppId), 'stats', 'UserAchievements.ini'),
      path.join(appdata,     'ALI213',  String(steamAppId), 'achievements.ini'),
    ];
    for (const p of aliPaths) {
      if (fs.existsSync(p)) return { type: 'ali213', saveFilePath: p, format: 'codex_ini' };
    }

    // 8. CreamAPI / Local steam_settings
    const creamPaths = [
      path.join(installDir, 'steam_settings', 'achievements.json'),
      path.join(installDir, 'steam_settings', 'stats.json'),
      path.join(installDir, '..', 'steam_settings', 'achievements.json'),
    ];
    for (const p of creamPaths) {
      const resolved = path.resolve(p);
      if (fs.existsSync(resolved)) {
        return { type: 'creamapi', saveFilePath: resolved, format: 'goldberg_json' };
      }
    }

    // 9. STEAM OFFLINE / DENUVO BYPASS
    // e.g., Black Myth: Wukong bypasses or legit offline accounts.
    // They run through the actual Steam client which writes to userdata.
    const steamUserdata = path.join(programFilesX86, 'Steam', 'userdata');
    if (fs.existsSync(steamUserdata)) {
      try {
        const binFiles = await fg(path.join(steamUserdata, '*', String(steamAppId), 'stats', 'achievements.bin').replace(/\\/g, '/'), { absolute: true, suppressErrors: true });
        if (binFiles.length > 0) {
           // Watch the most recently modified one if there are multiple users
           binFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
           return { type: 'steam_offline', saveFilePath: binFiles[0], format: 'steam_vdf' };
        }
      } catch (err: any) {
        log.warn(`[CrackedAch] Failed scanning Steam userdata: ${err.message}`);
      }
    }

    return null;
  }

  // ── Achievement Definitions ──────────────────────────────────────────────────

  private async loadDefinitions(gameId: string): Promise<Map<string, AchievementDefinition>> {
    const defs = new Map<string, AchievementDefinition>();

    try {
      // 1. Fetch hydrated definitions from local Prisma DB.
      // GameVault backend syncs RAWG/Steam/Epic definitions natively.
      const achievements = await prisma.achievement.findMany({ where: { gameId } });
      for (const a of achievements) {
        defs.set(a.key, {
          key: a.key,
          name: a.title,
          description: a.description,
          iconUrl: a.iconUrl || '',
          iconGrayUrl: '',
          globalPercent: undefined,
          isHidden: false,
        });
      }
    } catch (err: any) {
      log.warn(`[CrackedAch] Failed to load local achievement definitions: ${err.message}`);
    }

    return defs;
  }

  // ── Save File Parsing ────────────────────────────────────────────────────────

  private readSaveFile(profile: EmulatorProfile): Map<string, boolean> {
    const state = new Map<string, boolean>();

    try {
      if (!fs.existsSync(profile.saveFilePath)) return state;
      const raw = fs.readFileSync(profile.saveFilePath, 'utf8');

      if (profile.format === 'steam_vdf') {
        // Actual Steam offline stats bin file
        const parsed: any = vdf.parse(raw);
        const data = parsed?.data || {};
        for (const key of Object.keys(data)) {
          if (data[key].achieved === 1 || data[key].unlocked === 1) {
            state.set(key, true);
          }
        }
      } else if (profile.format === 'goldberg_json') {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const a of data) {
            const key = a.name || a.key || a.id;
            const earned = a.earned === true || a.achieved === 1 || a.unlocked === 1 || a.achieved === true;
            if (key) state.set(key, earned);
          }
        } else {
          for (const [key, val] of Object.entries(data as any)) {
            if (typeof val === 'object' && val !== null) {
              const v = val as any;
              const earned = v.earned === true || v.achieved === true || v.achieved === 1 || v.unlocked === true;
              state.set(key, earned);
            } else if (typeof val === 'boolean') {
              state.set(key, val);
            }
          }
        }
      } else if (profile.format === 'codex_ini') {
        const lines = raw.split(/\r?\n/);
        let currentKey: string | null = null;
        for (const line of lines) {
          const sectionMatch = line.match(/^\[(.+)\]$/);
          if (sectionMatch) {
            currentKey = sectionMatch[1].trim();
            if (!state.has(currentKey)) state.set(currentKey, false);
            continue;
          }
          if (currentKey) {
            const kvMatch = line.match(/^(Achieved|achieved|unlocked)\s*=\s*(.+)$/i);
            if (kvMatch) {
              const earned = kvMatch[2].trim() === '1' || kvMatch[2].trim().toLowerCase() === 'true';
              state.set(currentKey, earned);
            }
          }
        }
      }
    } catch (err: any) {
      log.warn(`[CrackedAch] Failed to read save file: ${err.message}`);
    }

    return state;
  }

  private getUnlockTime(profile: EmulatorProfile, key: string): Date {
    try {
      const raw = fs.readFileSync(profile.saveFilePath, 'utf8');

      if (profile.format === 'steam_vdf') {
        const parsed: any = vdf.parse(raw);
        const data = parsed?.data || {};
        if (data[key] && data[key].CRCUnlockTime) {
          return new Date(data[key].CRCUnlockTime * 1000);
        }
      } else if (profile.format === 'goldberg_json') {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const entry = data.find((a: any) => (a.name || a.key) === key);
          const t = entry?.earned_time || entry?.unlocktime || entry?.UnlockTime;
          if (t && t > 0) return new Date(t * 1000);
        } else {
          const entry = data[key];
          const t = entry?.earned_time || entry?.unlocktime || entry?.UnlockTime;
          if (t && t > 0) return new Date(t * 1000);
        }
      } else if (profile.format === 'codex_ini') {
        const lines = raw.split(/\r?\n/);
        let inSection = false;
        for (const line of lines) {
          if (line.trim() === `[${key}]`) { inSection = true; continue; }
          if (inSection && line.startsWith('[')) break;
          if (inSection) {
            const m = line.match(/^UnlockTime\s*=\s*(\d+)/i);
            if (m && parseInt(m[1]) > 0) return new Date(parseInt(m[1]) * 1000);
          }
        }
      }
    } catch {}
    return new Date();
  }

  // ── File Watching ────────────────────────────────────────────────────────────

  private startWatcher(game: WatchedGame) {
    const onFileChange = async () => {
      await new Promise(r => setTimeout(r, 300));
      await this.checkForNewUnlocks(game);
    };

    try {
      game.watcher = chokidar.watch(game.profile.saveFilePath, {
        persistent: true,
        usePolling: false,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        },
        ignoreInitial: true,
      });

      game.watcher.on('change', onFileChange);
      game.watcher.on('add',    onFileChange);
      game.watcher.on('error',  (err: any) => {
        log.warn(`[CrackedAch] Watcher error for ${game.title}: ${err.message}. Falling back to polling.`);
        this.startPolling(game);
      });

      log.info(`[CrackedAch] ✓ File watcher active for ${game.title}`);
    } catch (err: any) {
      log.warn(`[CrackedAch] chokidar failed for ${game.title}: ${err.message}. Using polling.`);
      this.startPolling(game);
    }
  }

  private startPolling(game: WatchedGame) {
    if (game.pollTimer) clearInterval(game.pollTimer);
    game.pollTimer = setInterval(() => {
      this.checkForNewUnlocks(game).catch(() => {});
    }, POLL_INTERVAL_MS);
  }

  // ── Achievement Diff Engine ──────────────────────────────────────────────────

  private async checkForNewUnlocks(game: WatchedGame) {
    const currentState = this.readSaveFile(game.profile);
    const newUnlocks: string[] = [];

    for (const [key, earned] of currentState.entries()) {
      const wasEarned = game.lastState.get(key) ?? false;
      if (earned && !wasEarned) {
        newUnlocks.push(key);
      }
    }

    game.lastState = currentState;

    for (const key of newUnlocks) {
      const def = game.definitions.get(key);
      const earnedAt = this.getUnlockTime(game.profile, key);

      const unlocked: UnlockedAchievement = {
        key,
        name: def?.name || key,
        description: def?.description || '',
        iconUrl: def?.iconUrl,
        iconGrayUrl: def?.iconGrayUrl,
        globalPercent: def?.globalPercent,
        isHidden: def?.isHidden,
        earnedAt,
        gameId: game.gameId,
        gameTitle: game.title,
        steamAppId: game.steamAppId,
        source: game.profile.type,
      };

      log.info(`[CrackedAch] 🏆 UNLOCKED: ${unlocked.name} in ${game.title} (${game.profile.type})`);
      this.emit('achievement:unlocked', unlocked);
    }
  }
}
