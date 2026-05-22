import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import prisma from '../db.js';
import { resolveAchievementPath } from './PathResolver.js';
import { AchievementWatcher } from './AchievementWatcher.js';
import { readAchievements, diffAchievements, AchievementState } from './AchievementReader.js';
import { resolveAllAchievementPaths, ResolvedPath } from './PathResolver.js';

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
  source: string;
}

interface WatchedGame {
  gameId: string;
  title: string;
  steamAppId: number;
  exePath: string;
  definitions: Map<string, AchievementDefinition>;
  lastState: AchievementState[];
  watchers: { watcher: AchievementWatcher; path: ResolvedPath }[];
}

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

    // 1. Resolve all paths
    const resolvedPaths = await resolveAllAchievementPaths(steamAppId, installDir);
    if (resolvedPaths.length === 0) {
      log.info(`[CrackedAch] No achievement paths resolved for ${title}`);
      return false;
    }

    log.info(`[CrackedAch] Resolved ${resolvedPaths.length} paths for ${title}`);

    // Try to auto-setup missing files for the best path
    const bestPath = resolvedPaths[0];
    if (bestPath.fileMissing || await this.isTemplateOnly(bestPath.filePath)) {
      log.info(`[CrackedAch] Best path is missing or template only. Attempting auto-setup/config.`);
      if (bestPath.emulator === 'goldberg') {
        try {
          const steamSettingsDir = path.dirname(bestPath.filePath);
          const localSavePath = path.join(steamSettingsDir, 'local_save.txt');
          if (!fs.existsSync(localSavePath)) {
            fs.writeFileSync(localSavePath, 'Saves');
          }
        } catch (e: any) {}
      }
      await this.setupMissingAchievements(steamAppId, bestPath.filePath);
    }

    // 2. Load definitions
    const definitions = await this.loadDefinitions(gameId);

    // 3. Read baseline (from the first path that actually has data, or just the best path)
    let baseline: AchievementState[] = [];
    for (const rp of resolvedPaths) {
       const state = await readAchievements(rp.filePath, rp.format);
       if (state.length > 0) {
         baseline = state;
         break;
       }
    }

    const game: WatchedGame = {
      gameId, title, steamAppId, exePath,
      definitions,
      lastState: baseline,
      watchers: []
    };

    this.watching.set(gameId, game);

    // 4. Start watching all resolved paths
    for (const rp of resolvedPaths) {
      const watcher = new AchievementWatcher();
      game.watchers.push({ watcher, path: rp });

      watcher.start(rp.filePath, async () => {
        log.info(`[CrackedAch] File change detected for ${title} at ${rp.filePath}`);
        const currentState = await readAchievements(rp.filePath, rp.format);
        const newlyUnlocked = diffAchievements(game.lastState, currentState);

        if (newlyUnlocked.length > 0) {
          log.info(`[CrackedAch] Found ${newlyUnlocked.length} new unlocks for ${title}`);
          game.lastState = currentState;

          for (const ach of newlyUnlocked) {
            this.processUnlock(game, ach, rp.emulator);
          }
        }
      });
    }

    // 5. Retroactive Sync
    const alreadyEarned = baseline.filter(a => a.unlocked);
    if (alreadyEarned.length > 0) {
      log.info(`[CrackedAch] Retroactive sync: Found ${alreadyEarned.length} existing unlocks for ${title}`);
      for (const ach of alreadyEarned) {
        this.processUnlock(game, ach, bestPath.emulator);
      }
    }

    return true;
  }

  private processUnlock(game: WatchedGame, ach: AchievementState, source: string) {
    let def = game.definitions.get(ach.id);
    if (!def) {
      // Fallback: match by key ignoring prefix (e.g. steam_ACHIEVEMENT -> ACHIEVEMENT)
      for (const [k, v] of game.definitions.entries()) {
        if (k.endsWith(`_${ach.id}`) || k === ach.id) {
          def = v;
          break;
        }
      }
    }

    const unlocked: UnlockedAchievement = {
      key: ach.id,
      name: def?.name || ach.id,
      description: def?.description || '',
      iconUrl: def?.iconUrl,
      iconGrayUrl: def?.iconGrayUrl,
      globalPercent: def?.globalPercent,
      isHidden: def?.isHidden,
      earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date(),
      gameId: game.gameId,
      gameTitle: game.title,
      steamAppId: game.steamAppId,
      source: source,
    };

    this.emit('achievement:unlocked', unlocked);
  }

  unwatch(gameId: string) {
    const game = this.watching.get(gameId);
    if (!game) return;

    if (game.watchers) {
      for (const w of game.watchers) {
        w.watcher.stop();
      }
    }

    this.watching.delete(gameId);
    log.info(`[CrackedAch] Stopped watching ${game.title}`);
  }

  unwatchAll() {
    for (const gameId of this.watching.keys()) {
      this.unwatch(gameId);
    }
  }

  private async setupMissingAchievements(steamAppId: number, filePath: string): Promise<boolean> {
    const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${steamAppId}`;
    try {
      log.info(`[CrackedAch] Fetching achievement keys from Steam API for AppID: ${steamAppId}`);
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.achievementpercentages && data.achievementpercentages.achievements) {
        const achievements = data.achievementpercentages.achievements;
        
        const achievementsObj: any = {};
        achievements.forEach((a: any) => {
          achievementsObj[a.name] = { earned: false };
        });

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(achievementsObj, null, 2));
        log.info(`[CrackedAch] Successfully created achievements.json at: ${filePath}`);
        return true;
      }
    } catch (err: any) {
      log.error(`[CrackedAch] Failed to setup missing achievements: ${err.message}`);
    }
    return false;
  }

  private async loadDefinitions(gameId: string): Promise<Map<string, AchievementDefinition>> {
    const defs = new Map<string, AchievementDefinition>();
    try {
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

    // Preserve this method for now as it is used in index.ts, but refactor to use new modules
  async scanForOfflineAchievements(userId: string, targetGameId?: string): Promise<UnlockedAchievement[]> {
    const allDiscovered: UnlockedAchievement[] = [];
    try {
      // Import session validator to gate achievement crediting
      const { areAchievementsPlausible } = await import('./SessionValidator.js');

      log.info(`[CrackedAch] Starting scan for offline achievements...`);
      const games = await prisma.game.findMany({
        where: { 
          steamAppId: { not: null },
          id: targetGameId ? targetGameId : undefined
        }
      });

      for (const game of games) {
        if (!game.steamAppId || !game.exePath) continue;

        const installDir = path.dirname(game.exePath);
        const resolvedPaths = await resolveAllAchievementPaths(game.steamAppId, installDir);
        if (resolvedPaths.length === 0) continue;

        let currentState: AchievementState[] = [];
        let emulator = 'unknown';
        for (const rp of resolvedPaths) {
          const state = await readAchievements(rp.filePath, rp.format);
          if (state.length > currentState.length) {
            currentState = state;
            emulator = rp.emulator;
          }
        }
        if (currentState.length === 0) continue;

        const earnedInDb = await prisma.gameAchievement.findMany({
          where: { userId, gameId: game.id, isEarned: true }
        });
        const earnedKeys = new Set(earnedInDb.map(a => a.key.replace(`${emulator}_`, '')));
        
        // Find missing achievements
        const newlyUnlocked = currentState.filter(ach => ach.unlocked && !earnedKeys.has(ach.id));
        if (newlyUnlocked.length === 0) continue;

        // ANTI-CHEAT GATE
        const isPlausible = areAchievementsPlausible(newlyUnlocked);
        if (!isPlausible) {
          log.warn(`[CrackedAch] Blocked ${newlyUnlocked.length} offline achievements for ${game.title} due to anti-cheat heuristics.`);
          continue;
        }

        const definitions = await this.loadDefinitions(game.id);

        for (const ach of newlyUnlocked) {
            const def = definitions.get(ach.id);
            allDiscovered.push({
              key: ach.id,
              name: def?.name || ach.id,
              description: def?.description || '',
              iconUrl: def?.iconUrl,
              iconGrayUrl: def?.iconGrayUrl,
              globalPercent: def?.globalPercent,
              isHidden: def?.isHidden,
              earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date(),
              gameId: game.id,
              gameTitle: game.title,
              steamAppId: game.steamAppId,
              source: emulator,
            });
          }
      }
    } catch (err: any) {
      log.error(`[CrackedAch] Background scan failed: ${err.message}`);
    }
    return allDiscovered;
  }

  async postSessionRescan(gameId: string): Promise<UnlockedAchievement[]> {
    log.info(`[CrackedAch] Running post-session rescan for ${gameId}`);
    return this.scanForOfflineAchievements('SYSTEM', gameId);
  }

  async backgroundSweepAll(userId: string): Promise<UnlockedAchievement[]> {
    log.info(`[CrackedAch] Running periodic background sweep`);
    return this.scanForOfflineAchievements(userId);
  }

  private async isTemplateOnly(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return true;
      const content = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        for (const val of Object.values(data)) {
          if (typeof val === 'object' && val !== null && (val as any).earned === true) {
            return false;
          }
        }
        return true;
      }
    } catch (e) {
      return true;
    }
    return false;
  }
}
