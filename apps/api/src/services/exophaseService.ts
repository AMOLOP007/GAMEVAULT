import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../lib/prisma.js';

export class ExophaseService {
  /**
   * Scrapes Exophase for a user's platform playtime and achievements
   * Supported platforms: 'steam', 'epic', 'psn', 'xbox', 'gog'
   */
  static async syncPlatform(userId: string, platform: string, username: string) {
    try {
      const url = `https://www.exophase.com/${platform}/user/${username}/`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(res.data);
      const games: any[] = [];

      // Exophase list parsing
      $('.game-list-item').each((i, el) => {
        const title = $(el).find('.title a').text().trim();
        const playtimeText = $(el).find('.playtime').text().trim(); // e.g. "12.5 hours"
        const progressText = $(el).find('.progress').text().trim(); // e.g. "15 / 50"
        
        let playtimeSeconds = 0;
        if (playtimeText) {
          const match = playtimeText.match(/(\d+(\.\d+)?)/);
          if (match) playtimeSeconds = Math.floor(parseFloat(match[1]) * 3600);
        }

        const progressMatch = progressText.match(/(\d+)\s*\/\s*(\d+)/);
        const earned = progressMatch ? parseInt(progressMatch[1]) : 0;
        const total = progressMatch ? parseInt(progressMatch[2]) : 0;

        games.push({ title, playtimeSeconds, earned, total });
      });

      // Hydrate DB
      for (const scraped of games) {
        // Find matching game in DB
        const game = await prisma.game.findFirst({
          where: { title: { contains: scraped.title, mode: 'insensitive' } }
        });

        if (game) {
          await prisma.userGame.upsert({
            where: { userId_gameId: { userId, gameId: game.id } },
            update: {
              totalPlaytime: scraped.playtimeSeconds > 0 ? scraped.playtimeSeconds : undefined,
            },
            create: {
              userId,
              gameId: game.id,
              totalPlaytime: scraped.playtimeSeconds,
              status: 'backlog'
            }
          });

          // Note: Full trophy sync would require clicking into each game on Exophase
          // For now, we update the summary stats
        }
      }

      return { gamesSynced: games.length };
    } catch (err) {
      console.error(`[Exophase] Sync failed for ${platform}/${username}:`, err);
      return { gamesSynced: 0, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
