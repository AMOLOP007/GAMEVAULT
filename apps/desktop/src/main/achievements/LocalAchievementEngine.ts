import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import prisma from '../db.js';
import { resolveAchievementPath } from './PathResolver.js';
import { AchievementWatcher } from './AchievementWatcher.js';
import { readAchievements, diffAchievements, AchievementState } from './AchievementReader.js';

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
  watcher: AchievementWatcher | null;
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

    // 1. Resolve path
    const resolved = await resolveAchievementPath(steamAppId, installDir);
    if (!resolved) {
      log.info(`[CrackedAch] No achievement path resolved for ${title}`);
      return false;
    }

    if (resolved.fileMissing) {
      log.info(`[CrackedAch] Achievement file missing for ${title}. Attempting auto-setup.`);
      const success = await this.setupMissingAchievements(steamAppId, resolved.filePath);
      if (!success) {
        log.warn(`[CrackedAch] Failed to auto-setup achievements for ${title}`);
        return false;
      }
    }

    log.info(`[CrackedAch] Resolved path: ${resolved.filePath} (${resolved.format})`);

    // 2. Load definitions
    const definitions = await this.loadDefinitions(gameId);

    // 3. Read baseline
    const baseline = await readAchievements(resolved.filePath, resolved.format);

    const watcher = new AchievementWatcher();

    const game: WatchedGame = {
      gameId, title, steamAppId, exePath,
      definitions,
      lastState: baseline,
      watcher
    };

    this.watching.set(gameId, game);

    // 4. Start watching
    watcher.start(resolved.filePath, async () => {
      log.info(`[CrackedAch] File change detected for ${title}`);
      const currentState = await readAchievements(resolved.filePath, resolved.format);
      const newlyUnlocked = diffAchievements(game.lastState, currentState);

      if (newlyUnlocked.length > 0) {
        log.info(`[CrackedAch] Found ${newlyUnlocked.length} new unlocks for ${title}`);
        game.lastState = currentState;

        for (const ach of newlyUnlocked) {
          let def = definitions.get(ach.id);
          if (!def) {
            // Fallback: match by key ignoring prefix (e.g. steam_ACHIEVEMENT -> ACHIEVEMENT)
            for (const [k, v] of definitions.entries()) {
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
            source: resolved.emulator,
          };

          this.emit('achievement:unlocked', unlocked);
        }
      }
    });

    return true;
  }

  unwatch(gameId: string) {
    const game = this.watching.get(gameId);
    if (!game) return;

    if (game.watcher) {
      game.watcher.stop();
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
        const resolved = await resolveAchievementPath(game.steamAppId, installDir);
        if (!resolved) continue;

        const currentState = await readAchievements(resolved.filePath, resolved.format);
        if (currentState.length === 0) continue;

        const earnedInDb = await prisma.gameAchievement.findMany({
          where: { userId, gameId: game.id, isEarned: true }
        });
        const earnedKeys = new Set(earnedInDb.map(a => a.key.replace(`${resolved.emulator}_`, '')));
        
        const definitions = await this.loadDefinitions(game.id);

        for (const ach of currentState) {
          if (ach.unlocked && !earnedKeys.has(ach.id)) {
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
              source: resolved.emulator,
            });
          }
        }
      }
    } catch (err: any) {
      log.error(`[CrackedAch] Background scan failed: ${err.message}`);
    }
    return allDiscovered;
  }
}
