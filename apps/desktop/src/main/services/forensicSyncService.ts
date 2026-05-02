import axios from 'axios';
import log from 'electron-log';
import store from '../store.js';
import { ForensicService } from './forensicService.js';

export class ForensicSyncService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = `http://localhost:${process.env.API_PORT || 3001}/api/sync/forensic`;
  }

  /**
   * Performs a high-accuracy forensic sync for a specific Steam game.
   */
  public async syncGame(appId: string, gameId: string) {
    const token = store.get('token');
    if (!token) return;

    log.info(`[ForensicSync] Starting sync for AppID: ${appId}`);

    const evidence = await ForensicService.gatherEvidence(appId);
    if (!evidence) {
      log.warn(`[ForensicSync] No evidence found for AppID: ${appId}`);
      return;
    }

    try {
      const response = await axios.post(this.apiUrl, {
        ...evidence,
        gameId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      log.info(`[ForensicSync] Successfully synced ${appId}. Missed seconds recovered: ${response.data.missedSeconds}`);
    } catch (err: any) {
      log.error(`[ForensicSync] Sync failed for ${appId}: ${err.message}`);
    }
  }

  /**
   * Background sync for all games in the user's library.
   */
  public async syncAll(userGames: { steamAppId: string; gameId: string }[]) {
    log.info(`[ForensicSync] Bulk sync started for ${userGames.length} games`);
    for (const ug of userGames) {
      if (ug.steamAppId) {
        await this.syncGame(ug.steamAppId, ug.gameId);
        // Throttle to avoid OS log locking
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

export const forensicSyncService = new ForensicSyncService();
