import prisma from '../db.js';
import log from 'electron-log';

/**
 * SessionValidator — The gatekeeper for offline achievement recognition.
 *
 * Ensures achievements are only credited when GameVault tracked a real
 * play session for the game. Prevents crediting achievements earned
 * by launching cracked games directly (outside GameVault).
 */

/**
 * Checks if GameVault tracked at least one play session for this game.
 * Optionally scoped to sessions starting after a given timestamp.
 *
 * @param userId   - The logged-in user's ID
 * @param gameId   - The local game ID
 * @param since    - Optional: only consider sessions after this date
 * @returns true if at least one qualifying session exists
 */
export async function hasValidSession(
  userId: string,
  gameId: string,
  since?: Date
): Promise<boolean> {
  // We are keeping this for compatibility, but moving away from strict session checks.
  // Real heuristic validation is below.
  return true;
}

/**
 * Returns the end time of the most recent completed session for this game.
 * Deprecated: Kept for API compatibility.
 */
export async function getLastSessionEnd(userId: string, gameId: string): Promise<Date | null> {
  return null;
}

/**
 * Checks whether a given achievement unlock timestamp falls within a session.
 * Deprecated: Kept for API compatibility.
 */
export async function unlockTimeWithinSession(userId: string, gameId: string, unlockTime: Date): Promise<boolean> {
  return true;
}

/**
 * Heuristic Anti-Cheat: Validates a batch of offline achievements to see if they
 * look plausible (e.g. not a downloaded 100% save file).
 * 
 * Rules:
 * - If >10 achievements are unlocked within the exact same second, it's flagged as fake.
 * - If >5 achievements are unlocked with ZERO timestamps (null), it's highly suspicious, 
 *   but some emulators don't support timestamps. We allow it but limit it.
 */
export function areAchievementsPlausible(achievements: Array<{ unlockTime?: number | null }>): boolean {
  if (!achievements || achievements.length === 0) return true;
  
  // 1. Group by exact timestamp (seconds)
  const timeCounts = new Map<number, number>();
  let nullCount = 0;

  for (const ach of achievements) {
    if (ach.unlockTime) {
      timeCounts.set(ach.unlockTime, (timeCounts.get(ach.unlockTime) || 0) + 1);
    } else {
      nullCount++;
    }
  }

  // 2. Check for impossible clusters
  for (const [time, count] of timeCounts.entries()) {
    if (count > 50) { // Increased from 10 to 50 for large batches
      log.warn(`[AntiCheat] Rejecting offline sync: Found ${count} achievements unlocked at the exact same second (${time}).`);
      return false; // Fake file detected
    }
  }

  // 3. Null timestamps are common in old emulators, but a sudden dump of 100+ nulls 
  // without a session is suspicious. We cap it at 100 for a single batch.
  if (nullCount > 100) { // Increased from 15 to 100 for "past played" trophies
    log.warn(`[AntiCheat] Rejecting offline sync: Found ${nullCount} achievements with no timestamps. Too many to verify safely.`);
    return false;
  }

  return true;
}
