import axios from 'axios';
import Store from './store.js';
import prisma from './db.js';
const store = Store;

export class SyncService {
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  startSyncLoop() {
    this.syncTimer = setInterval(async () => {
      if (store.get('syncEnabled')) {
        await this.syncWithSupabase();
      }
    }, 60000); // Every 60s
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
        await axios.post(`${process.env.API_URL}/api/sync/sessions`, session, {
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
        await axios.post(`${process.env.API_URL}/api/sync/achievements`, ach, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await (prisma as any).userAchievement.update({
          where: { id: ach.id },
          data: { synced: true }
        });
      }

      console.log(`[Sync] Synced ${unsyncedSessions.length} sessions and ${unsyncedAchievements.length} achievements`);
    } catch (error) {
      console.error('[Sync] Error syncing with Supabase:', error);
    }
  }
}
