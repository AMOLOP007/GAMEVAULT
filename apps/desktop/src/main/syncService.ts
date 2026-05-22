import axios from 'axios';
import Store from './store.js';
import prisma from './db.js';
import { API_BASE_URL } from './config.js';
import log from 'electron-log';
const store = Store;

export class SyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isPaused = false;

  startSyncLoop() {
    this.syncTimer = setInterval(async () => {
      if (store.get('syncEnabled') && !this.isPaused) {
        await this.syncWithSupabase();
      }
    }, 120000); // Every 120s
  }

  pauseSync() {
    this.isPaused = true;
    log.info('[Sync] Sync loop paused (gaming mode)');
  }

  resumeSync() {
    this.isPaused = false;
    log.info('[Sync] Sync loop resumed');
  }

  stopSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer);
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
