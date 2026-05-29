import prisma from '../db.js';
import log from 'electron-log';
import { ForensicService } from '../services/forensicService.js';

/**
 * SessionValidator — Multi-layer gatekeeper for offline achievement recognition.
 *
 * Prevents crediting achievements from:
 *   - Downloaded 100% save files
 *   - Save editors that batch-stamp achievements
 *   - Cheat Engine / memory manipulation tools
 *
 * Does NOT block:
 *   - Legitimate offline play (even long sessions)
 *   - Emulators that don't support timestamps (small batches)
 *   - Multiple achievements earned in rapid succession (within plausible limits)
 */

// ── Proportional Thresholds ────────────────────────────────────────────────────
// Scale the maximum "same-second cluster" based on the game's total achievement count.
// Larger games naturally produce bigger legitimate batches (e.g. story milestones).
function getMaxSameSecondCluster(totalAchievements: number): number {
  if (totalAchievements <= 20) return 8;
  if (totalAchievements <= 60) return 15;
  if (totalAchievements <= 200) return 30;
  return 50;
}

/**
 * Checks if GameVault tracked at least one play session for this game.
 * Optionally scoped to sessions starting after a given timestamp.
 *
 * NOTE: Kept as a permissive no-op for backward compatibility.
 * Offline play without GameVault open is a legitimate use case.
 * Real fraud detection happens in areAchievementsPlausible().
 *
 * @param userId   - The logged-in user's ID
 * @param gameId   - The local game ID
 * @param since    - Optional: only consider sessions after this date
 * @returns true always (fraud detection is in areAchievementsPlausible)
 */
export async function hasValidSession(
  userId: string,
  gameId: string,
  since?: Date
): Promise<boolean> {
  // Permissive — real validation is heuristic-based below.
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
 * Multi-Layer Heuristic Anti-Cheat: Validates a batch of offline achievements to
 * determine if they look plausible or if they were injected (e.g. downloaded 100% save).
 *
 * Layer 1: Proportional cluster detection (same-second stamps)
 * Layer 2: Temporal entropy check (diversity of timestamps)
 * Layer 3: Zero-timestamp ratio check (null timestamps)
 * Layer 4: Impossible-speed detection (sustained unlock rate)
 *
 * @param achievements  - Array of achievements with optional unlockTime (unix seconds)
 * @param totalGameAchievements - Total achievements the game has (for proportional scaling)
 * @returns true if the batch looks legitimate
 */
export function areAchievementsPlausible(
  achievements: Array<{ unlockTime?: number | null }>,
  totalGameAchievements?: number
): boolean {
  if (!achievements || achievements.length === 0) return true;

  const count = achievements.length;

  // ── Layer 1: Proportional Same-Second Cluster Detection ─────────────────────
  // If too many achievements share the exact same unix timestamp, it's a fake file.
  const timeCounts = new Map<number, number>();
  let nullCount = 0;
  const validTimestamps: number[] = [];

  for (const ach of achievements) {
    if (ach.unlockTime && ach.unlockTime > 0) {
      timeCounts.set(ach.unlockTime, (timeCounts.get(ach.unlockTime) || 0) + 1);
      validTimestamps.push(ach.unlockTime);
    } else {
      nullCount++;
    }
  }

  const maxCluster = getMaxSameSecondCluster(totalGameAchievements || count);
  for (const [time, clusterSize] of timeCounts.entries()) {
    if (clusterSize > maxCluster) {
      log.warn(`[AntiCheat] L1 REJECT: ${clusterSize} achievements at timestamp ${time} exceeds max cluster ${maxCluster} for ${totalGameAchievements || count}-achievement game.`);
      return false;
    }
  }

  // ── Layer 2: Temporal Entropy Check ─────────────────────────────────────────
  // Legitimate play produces achievements spread across different timestamps.
  // If >80% of all timestamped achievements share the same second, it's suspicious.
  if (validTimestamps.length >= 10) {
    const uniqueTimestamps = new Set(validTimestamps).size;
    const entropyRatio = uniqueTimestamps / validTimestamps.length;
    // If less than 20% of timestamps are unique, it's a bulk-stamped file
    if (entropyRatio < 0.20) {
      log.warn(`[AntiCheat] L2 REJECT: Temporal entropy too low (${(entropyRatio * 100).toFixed(1)}% unique timestamps across ${validTimestamps.length} achievements). Likely bulk-stamped.`);
      return false;
    }
  }

  // ── Layer 3: Zero-Timestamp Ratio Check ─────────────────────────────────────
  // Some old emulators don't write timestamps, so small batches with nulls are OK.
  // But a massive dump of 100+ null-timestamped achievements is suspicious.
  if (count > 20 && nullCount > 0) {
    const nullRatio = nullCount / count;
    if (nullRatio > 0.60) {
      log.warn(`[AntiCheat] L3 REJECT: ${nullCount}/${count} achievements (${(nullRatio * 100).toFixed(0)}%) have null timestamps. Exceeds 60% threshold for batches over 20.`);
      return false;
    }
  }
  // Hard cap for very large null batches regardless of ratio
  if (nullCount > 100) {
    log.warn(`[AntiCheat] L3 REJECT: ${nullCount} null-timestamp achievements exceeds hard cap of 100.`);
    return false;
  }

  // ── Layer 4: Impossible-Speed Detection ─────────────────────────────────────
  // If N achievements are unlocked within a T-second window where N/T > 1 per 10 seconds,
  // sustained over 5+ achievements, flag as impossible.
  if (validTimestamps.length >= 5) {
    const sorted = [...validTimestamps].sort((a, b) => a - b);

    // Sliding window: check every consecutive group of 5 achievements
    const WINDOW_SIZE = 5;
    const MIN_SECONDS_PER_ACHIEVEMENT = 10; // A human can't earn 1 achievement per 10 seconds sustained

    for (let i = 0; i <= sorted.length - WINDOW_SIZE; i++) {
      const windowStart = sorted[i];
      const windowEnd = sorted[i + WINDOW_SIZE - 1];
      const windowDuration = windowEnd - windowStart;

      // If 5 achievements were earned within 50 seconds (5 * 10), flag it
      if (windowDuration < WINDOW_SIZE * MIN_SECONDS_PER_ACHIEVEMENT && windowDuration >= 0) {
        // Exception: if all 5 are at different timestamps (just very close), allow it.
        // This handles the case where a story game unlocks several milestones at the end.
        const uniqueInWindow = new Set(sorted.slice(i, i + WINDOW_SIZE)).size;
        if (uniqueInWindow < 3) {
          log.warn(`[AntiCheat] L4 REJECT: ${WINDOW_SIZE} achievements in ${windowDuration}s window with only ${uniqueInWindow} unique timestamps. Impossible sustained speed.`);
          return false;
        }
      }
    }
  }

  log.info(`[AntiCheat] PASS: ${count} achievements passed all 4 fraud detection layers.`);
  return true;
}

/**
 * Forensic Cross-Reference: Checks whether the machine was powered on during
 * the time window when achievements were supposedly earned.
 *
 * This is a SOFT check — it logs warnings but does NOT block crediting.
 * The forensic data is used for auditing and can be made strict in the future.
 *
 * @param steamAppId - The Steam App ID for the game
 * @param achievements - Achievements with timestamps to verify
 * @returns Object with validation result and any warnings
 */
export async function crossReferenceForensic(
  steamAppId: string,
  achievements: Array<{ unlockTime?: number | null }>
): Promise<{ valid: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    const evidence = await ForensicService.gatherEvidence(steamAppId);
    if (!evidence || !evidence.powerEvents || evidence.powerEvents.length === 0) {
      // No forensic data available — cannot cross-reference, pass through
      return { valid: true, warnings: ['No forensic power event data available for cross-reference.'] };
    }

    // Build power windows (pairs of wake/boot → sleep/shutdown events)
    const powerWindows: Array<{ start: number; end: number }> = [];
    let currentStart: number | null = null;

    // Sort events chronologically
    const sortedEvents = [...evidence.powerEvents].sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    for (const event of sortedEvents) {
      const eventTime = new Date(event.time).getTime() / 1000;
      // Boot / Wake events: 1, 12, 107
      if ([1, 12, 107].includes(event.id)) {
        if (currentStart === null) {
          currentStart = eventTime;
        }
      }
      // Sleep / Shutdown events: 13, 42
      if ([13, 42].includes(event.id)) {
        if (currentStart !== null) {
          powerWindows.push({ start: currentStart, end: eventTime });
          currentStart = null;
        }
      }
    }
    // If machine is still on (no closing event), extend to now
    if (currentStart !== null) {
      powerWindows.push({ start: currentStart, end: Date.now() / 1000 });
    }

    if (powerWindows.length === 0) {
      return { valid: true, warnings: ['Could not construct power windows from forensic data.'] };
    }

    // Check each achievement's timestamp against power windows
    let outsideCount = 0;
    for (const ach of achievements) {
      if (!ach.unlockTime || ach.unlockTime <= 0) continue;
      const inWindow = powerWindows.some(w => ach.unlockTime! >= w.start && ach.unlockTime! <= w.end);
      if (!inWindow) {
        outsideCount++;
      }
    }

    if (outsideCount > 0) {
      const totalTimestamped = achievements.filter(a => a.unlockTime && a.unlockTime > 0).length;
      const pct = ((outsideCount / totalTimestamped) * 100).toFixed(0);
      warnings.push(`${outsideCount}/${totalTimestamped} (${pct}%) achievement timestamps fall outside known machine power-on windows.`);
      log.warn(`[AntiCheat/Forensic] ${warnings[warnings.length - 1]}`);
    }

    return { valid: true, warnings };
  } catch (err: any) {
    log.warn(`[AntiCheat/Forensic] Cross-reference failed (non-fatal): ${err.message}`);
    return { valid: true, warnings: [`Forensic check failed: ${err.message}`] };
  }
}
