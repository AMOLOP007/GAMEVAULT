import { PrismaClient } from 'prisma-client-desktop/index.js';
import { resolveAllAchievementPaths } from './PathResolver.js';
import { readAchievements, diffAchievements, AchievementState } from './AchievementReader.js';
import { areAchievementsPlausible, crossReferenceForensic } from './SessionValidator.js';
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

// ── Known emulator prefixes to strip when comparing keys ────────────────────
const EMULATOR_PREFIXES = [
  'goldberg_', 'goldberg_or_creamapi_', 'codex_', 'empress_', 'empress_v2_',
  'creamapi_', 'onlinefix_', 'tenoke_', 'rune_', 'skidrow_', 'flt_',
  'smartsteam_', 'custom_via_ini_', 'generic_ini_', '3dm_',
  'voices38_ue_', 'unknown_deep_scan_',
];

/**
 * Strips all known emulator prefixes from an achievement key to get the canonical ID.
 * Handles multiple prefixes and case-insensitive matching.
 */
function canonicalizeKey(key: string): string {
  let cleaned = key;
  for (const prefix of EMULATOR_PREFIXES) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.substring(prefix.length);
      break; // Only strip one prefix (they don't nest)
    }
  }
  return cleaned;
}

export async function scanOnStartup(watchedGames: WatchedGame[], db: any, userId: string): Promise<MissedTrophyReport[]> {
  const report: MissedTrophyReport[] = [];

  for (const game of watchedGames) {
    try {
      log.info(`[StartupScan] Scanning for ${game.title}`);
      
      const resolvedPaths = await resolveAllAchievementPaths(game.steamAppId, path.dirname(game.exePath));
      if (resolvedPaths.length === 0) {
        log.info(`[StartupScan] No achievement paths found for ${game.title}`);
        continue;
      }

      // ── Multi-Source Merge: Union achievements from ALL resolved paths ─────
      // Some emulators split data across files. Merge them all, keeping the
      // most recent unlock time for each key.
      const mergedMap = new Map<string, AchievementState>();
      let emulator = 'unknown';

      for (const rp of resolvedPaths) {
        const state = await readAchievements(rp.filePath, rp.format);
        for (const ach of state) {
          const existing = mergedMap.get(ach.id);
          if (!existing) {
            mergedMap.set(ach.id, ach);
          } else if (ach.unlocked && !existing.unlocked) {
            // This source has it unlocked, the other doesn't — prefer unlocked
            mergedMap.set(ach.id, ach);
          } else if (ach.unlocked && existing.unlocked && ach.unlockTime && existing.unlockTime && ach.unlockTime > existing.unlockTime) {
            // Both unlocked, but this one has a more recent timestamp
            mergedMap.set(ach.id, ach);
          }
        }
        // Use the emulator name from the first path that has data
        if (state.length > 0 && emulator === 'unknown') {
          emulator = rp.emulator;
        }
      }

      const currentAchievements = Array.from(mergedMap.values());
      if (currentAchievements.length === 0) continue;

      // ── Query DB: Canonicalize keys on BOTH sides before comparison ─────────
      const earnedInDb = await (db as any).gameAchievement.findMany({
        where: { gameId: game.gameId, isEarned: true, userId }
      });
      
      // Build a set of canonical keys from the DB
      const earnedCanonicalKeys = new Set(
        earnedInDb.map((a: any) => canonicalizeKey(a.key))
      );

      // Find achievements that are unlocked in the emulator file but NOT in the DB
      const newlyUnlocked = currentAchievements.filter(ach => 
        ach.unlocked && !earnedCanonicalKeys.has(canonicalizeKey(ach.id))
      );

      if (newlyUnlocked.length === 0) continue;

      log.info(`[StartupScan] Found ${newlyUnlocked.length} new achievements for ${game.title}`);

      // ── ANTI-CHEAT GATE ───────────────────────────────────────────────────
      // Fetch total achievement count for proportional thresholds
      let totalAchievements = currentAchievements.length;
      try {
        const achCount = await (db as any).achievement.count({ where: { gameId: game.gameId } });
        if (achCount > 0) totalAchievements = achCount;
      } catch {}

      const isPlausible = areAchievementsPlausible(newlyUnlocked, totalAchievements);

      if (!isPlausible) {
        log.warn(`[StartupScan] Blocked ${newlyUnlocked.length} offline achievements for ${game.title} due to anti-cheat heuristics.`);
        continue; // Skip this game entirely
      }

      // ── FORENSIC CROSS-REFERENCE (soft check — log only) ──────────────────
      try {
        const forensicResult = await crossReferenceForensic(
          String(game.steamAppId),
          newlyUnlocked
        );
        if (forensicResult.warnings.length > 0) {
          for (const w of forensicResult.warnings) {
            log.warn(`[StartupScan] Forensic: ${w}`);
          }
        }
      } catch (err: any) {
        log.warn(`[StartupScan] Forensic cross-reference skipped: ${err.message}`);
      }

      const validated = newlyUnlocked;
      log.info(`[StartupScan] Validated ${validated.length} offline achievements for ${game.title}`);
      // ── END ANTI-CHEAT GATE ───────────────────────────────────────────────

      report.push({
        gameId: game.gameId,
        gameName: game.title,
        achievements: validated
      });

      // Upsert validated achievements to DB
      for (const ach of validated) {
        const dbKey = `${emulator}_${ach.id}`;
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
              source: emulator
            }
          });

          // ── Also upsert the CANONICAL (unprefixed) key ──────────────────
          // This ensures the Trophies tab (which queries by Steam canonical key)
          // finds a match regardless of which emulator earned it.
          const canonicalKey = canonicalizeKey(ach.id);
          if (canonicalKey !== dbKey) {
            try {
              await (db as any).gameAchievement.upsert({
                where: {
                  userId_gameId_key: {
                    userId,
                    gameId: game.gameId,
                    key: canonicalKey
                  }
                },
                update: {
                  isEarned: true,
                  earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date()
                },
                create: {
                  userId,
                  gameId: game.gameId,
                  key: canonicalKey,
                  name: ach.id,
                  description: '',
                  isEarned: true,
                  earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000) : new Date(),
                  source: emulator
                }
              });
            } catch {} // Non-fatal: canonical key may already exist
          }

          // Sync to API
          try {
            await axios.post(`${API_BASE_URL}/api/sync/achievements`, {
              gameId: game.gameId,
              key: dbKey,
              name: ach.id,
              isEarned: true,
              earnedAt: ach.unlockTime ? new Date(ach.unlockTime * 1000).toISOString() : new Date().toISOString(),
              source: emulator
            });
          } catch (apiErr: any) {
            log.warn(`[StartupScan] API sync failed for ${ach.id}: ${apiErr.message}`);
            // Achievement is saved locally, will sync on next opportunity
          }
        } catch (dbErr: any) {
          log.error(`[StartupScan] DB error for ${ach.id}: ${dbErr.message}`);
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
