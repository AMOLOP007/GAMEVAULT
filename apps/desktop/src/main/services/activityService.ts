import axios from 'axios';
import log from 'electron-log';
import store from '../store.js';

export type ActivityType = 'STARTED_PLAYING' | 'EARNED_ACHIEVEMENT' | 'ADDED_GAME';

export class ActivityService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = `http://localhost:${process.env.API_PORT || 3001}/api/social`;
  }

  public async reportActivity(type: ActivityType, gameId?: string, metadata?: any) {
    const token = store.get('token');
    const userId = store.get('userId');

    if (!token || !userId) return;

    try {
      await axios.post(`${this.apiUrl}/activity`, {
        userId,
        type,
        gameId,
        metadata
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      log.info(`[ActivityService] Reported ${type} for game ${gameId}`);
    } catch (err: any) {
      log.warn(`[ActivityService] Failed to report activity: ${err.message}`);
    }
  }
}

export const activityService = new ActivityService();
