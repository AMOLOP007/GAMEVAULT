import axios from 'axios';
import Store from './store.js';
import prisma from './db.js';
import { API_BASE_URL } from './config.js';
import log from 'electron-log';
const store = Store;

// PERF: Minimum interval between syncs to prevent hammering during rapid events
const MIN_SYNC_INTERVAL_MS = 30000; // 30 seconds

export class SyncService {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private isPaused = false;
  private isSyncing = false;
  private lastSyncAt = 0;
  // PERF: Fallback periodic check — catches anything missed by event triggers
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;

  startSyncLoop() {
    // PERF: Event-driven sync with fallback periodic check every 5 minutes
    // The old approach used setInterval(120s) which ran even with nothing to sync
    this.fallbackTimer = setInterval(() => {
      if (store.get('syncEnabled') && !this.isPaused) {
        this.requestSync();
      }
    }, 5 * 60 * 1000); // 5 minutes fallback (was 2 minutes)
  }

  // PERF: Event-driven sync — call this when something changes (session end, achievement, etc.)
  requestSync() {
    if (this.isPaused || !store.get('syncEnabled')) return;

    // Debounce: if we synced recently, schedule one for later
    const now = Date.now();
    const elapsed = now - this.lastSyncAt;

    if (elapsed < MIN_SYNC_INTERVAL_MS) {
      if (!this.syncTimer) {
        const delay = MIN_SYNC_INTERVAL_MS - elapsed;
        this.syncTimer = setTimeout(() => {
          this.syncTimer = null;
          this.doSync();
        }, delay);
      }
      return;
    }

    this.doSync();
  }

  private async doSync() {
    if (this.isSyncing || this.isPaused) return;
    this.isSyncing = true;
    this.lastSyncAt = Date.now();

    try {
      await this.syncWithSupabase();
    } finally {
      this.isSyncing = false;
    }
  }

  pauseSync() {
    this.isPaused = true;
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    log.info('[Sync] Sync loop paused (gaming mode)');
  }

  resumeSync() {
    this.isPaused = false;
    log.info('[Sync] Sync loop resumed');
    // Trigger an immediate sync on resume in case anything queued up
    this.requestSync();
  }

  stopSyncLoop() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    if (this.syncTimer) clearTimeout(this.syncTimer);
  }

  private async syncWithSupabase() {
    const token = store.get('token');
    if (!token) return;

    try {
      // Sync PlaySessions
      const unsyncedSessions = await (prisma as any).playSession.findMany({
        where: { synced: false, endTime: { not: null } }
      });

      for (const session of unsyncedSessions) {
        await axios.post(`${API_BASE_URL}/api/sync/sessions`, session, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await (prisma as any).playSession.update({
          where: { id: session.id },
          data: { synced: true }
        });
      }

      // Sync Achievements
      const unsyncedAchievements = await (prisma as any).userAchievement.findMany({
        where: { synced: false }
      });

      for (const ach of unsyncedAchievements) {
        await axios.post(`${API_BASE_URL}/api/sync/achievements`, ach, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await (prisma as any).userAchievement.update({
          where: { id: ach.id },
          data: { synced: true }
        });
      }

      if (unsyncedSessions.length > 0 || unsyncedAchievements.length > 0) {
        log.info(`[Sync] Synced ${unsyncedSessions.length} sessions and ${unsyncedAchievements.length} achievements`);
      }
    } catch (error: any) {
      log.error(`[Sync] Error syncing with Supabase: ${error.message}`);
    }
  }
}
