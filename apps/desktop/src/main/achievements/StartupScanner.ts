import { PrismaClient } from 'prisma-client-desktop/index.js';
import { resolveAchievementPath } from './PathResolver.js';
import { readAchievements, diffAchievements, AchievementState } from './AchievementReader.js';
import axios from 'axios';
import log from 'electron-log';
import { API_BASE_URL } from '../config.js';
import path from 'path';

export interface WatchedGame {
  gameId: string;
  title: string;
  steamAppId: number;
  exePath: string;
}

export interface MissedTrophyReport {
  gameId: string;
  gameName: string;
  achievements: AchievementState[];
}

export interface NotificationItem {
  gameId: string;
  gameName: string;
  achievementId: string;
}

export interface NotificationBatch {
  mode: 'sequential' | 'grouped' | 'summary';
  items: NotificationItem[];
}

export async function scanOnStartup(watchedGames: WatchedGame[], db: any, userId: string): Promise<MissedTrophyReport[]> {
  const report: MissedTrophyReport[] = [];

  for (const game of watchedGames) {
    try {
      log.info(`[StartupScan] Scanning for ${game.title}`);
      
      const resolved = await resolveAchievementPath(game.steamAppId, path.dirname(game.exePath));
      if (!resolved) {
        log.info(`[StartupScan] No achievement path found for ${game.title}`);
        continue;
      }

      const currentAchievements = await readAchievements(resolved.filePath, resolved.format);
      if (currentAchievements.length === 0) continue;

      // Query DB for already unlocked achievements
      const earnedInDb = await (db as any).gameAchievement.findMany({
        where: { gameId: game.gameId, isEarned: true, userId }
      });
      
      const prevMapped: AchievementState[] = earnedInDb.map((a: any) => ({
        id: a.key.replace(`${resolved.emulator}_`, ''), // Strip emulator prefix if stored that way
        unlocked: true
      }));

      const newlyUnlocked = diffAchievements(prevMapped, currentAchievements);

      if (newlyUnlocked.length > 0) {
        log.info(`[StartupScan] Found ${newlyUnlocked.length} new achievements for ${game.title}`);
        
        report.push({
          gameId: game.gameId,
          gameName: game.title,
          achievements: newlyUnlocked
        });

        // Upsert to DB
        for (const ach of newlyUnlocked) {
          const dbKey = `${resolved.emulator}_${ach.id}`;
          try {
            await (db as any).gameAchievement.upsert({
              where: {
                userId_gameId_key: {
                  userId,
                  gameId: game.gameId,
                  key: dbKey
                }
              },
              update: {
                isEarned: true,
                earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date()
              },
              create: {
                userId,
                gameId: game.gameId,
                key: dbKey,
                name: ach.id,
                description: '',
                isEarned: true,
                earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date(),
                source: resolved.emulator
              }
            });

            // Sync to API
            try {
              await axios.post(`${API_BASE_URL}/api/sync/achievements`, {
                gameId: game.gameId,
                key: dbKey,
                name: ach.id,
                isEarned: true,
                earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000).toISOString() : new Date().toISOString(),
                source: resolved.emulator
              });
            } catch (apiErr: any) {
              log.warn(`[StartupScan] API sync failed for ${ach.id}: ${apiErr.message}`);
              // Achievement is saved locally, will sync on next opportunity
            }
          } catch (dbErr: any) {
            log.error(`[StartupScan] DB error for ${ach.id}: ${dbErr.message}`);
          }
        }
      }
    } catch (err: any) {
      log.error(`[StartupScan] Failed scanning ${game.title}: ${err.message}`);
    }
  }

  return report;
}

export function formatNotificationStrategy(reports: MissedTrophyReport[]): NotificationBatch {
  const allItems: NotificationItem[] = [];
  
  for (const r of reports) {
    for (const a of r.achievements) {
      allItems.push({
        gameId: r.gameId,
        gameName: r.gameName,
        achievementId: a.id
      });
    }
  }

  const count = allItems.length;

  if (count === 0) {
    return { mode: 'sequential', items: [] };
  }

  if (count >= 1 && count <= 3) {
    return { mode: 'sequential', items: allItems };
  }

  if (count >= 4 && count <= 15) {
    return { mode: 'grouped', items: allItems };
  }

  return { mode: 'summary', items: allItems };
}
