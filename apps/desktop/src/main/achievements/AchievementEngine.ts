import { EventEmitter } from 'events';
import prisma from '../db.js';
import axios from 'axios';
import store from '../store.js';
import { API_BASE_URL } from '../config.js';
import log from 'electron-log';

export class AchievementEngine extends EventEmitter {
  async checkAllAchievements(userId: string, gameId: string) {
    try {
      const token = store.get('token');
      if (!token) return;

      // 1. Fetch current stats for the game
      const userGame = await (prisma as any).userGame.findUnique({
        where: { userId_gameId: { userId, gameId } }
      });

      if (!userGame) return;

      const sessionCount = await (prisma as any).playSession.count({ where: { userId, gameId } });
      const lastSession = await (prisma as any).playSession.findFirst({
        where: { userId, gameId },
        orderBy: { startTime: 'desc' }
      });

      // 2. Call API to check and unlock milestones
      const response = await axios.post(`${API_BASE_URL}/api/achievements/check`, {
        gameId,
        stats: {
          totalPlaytime: userGame.totalPlaytime,
          sessionPlaytime: lastSession?.duration || 0,
          sessionCount
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newlyUnlocked = response.data.unlocked || [];

      for (const ach of newlyUnlocked) {
        log.info(`[AchievementEngine] UNLOCKED: ${ach.title}`);
        this.emit('achievement:unlocked', {
          gameId,
          title: ach.title,
          description: ach.description,
          iconUrl: ach.iconUrl,
          source: ach.source
        });
      }

    } catch (err: any) {
      log.error(`[AchievementEngine] Failed to check achievements: ${err.message}`);
    }
  }
}
