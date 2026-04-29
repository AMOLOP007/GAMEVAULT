import { FastifyInstance, FastifyRequest } from 'fastify';
import { syncSteamAchievements } from '../services/steamSyncService.js';
import prisma from '../lib/prisma.js';

export default async function syncRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);

  // POST /api/sync/steam-id - Save the user's Steam ID
  fastify.post('/steam-id', async (request: FastifyRequest) => {
    const { steamId } = request.body as { steamId: string };
    const userId = (request.user as any).sub;

    if (!steamId) throw new Error('Steam ID is required');

    return await (prisma as any).user.update({
      where: { id: userId },
      data: { steamId }
    });
  });

  // POST /api/sync/steam (Requires API Key)
  fastify.post('/steam', async (request: FastifyRequest) => {
    const { steamId, apiKey: providedKey } = request.body as { steamId: string; apiKey?: string };
    const userId = (request.user as any).sub;
    
    const apiKey = providedKey || process.env.STEAM_API_KEY;

    if (!steamId || !apiKey) {
      throw new Error('Steam ID is required and no server-side API Key is configured');
    }

    return await syncSteamAchievements(userId, steamId, apiKey);
  });

  // POST /api/sync/steam-public (No API Key required)
  fastify.post('/steam-public', async (request: FastifyRequest) => {
    const { steamId, gameId, steamAppId } = request.body as { steamId: string; gameId: string; steamAppId: string };
    const userId = (request.user as any).sub;

    if (!steamId || !gameId || !steamAppId) {
      throw new Error('Steam ID, Game ID, and Steam App ID are required');
    }

    const { steamScraper } = await import('../services/steamScraperService.js');
    return await steamScraper.syncAchievements(userId, gameId, steamId, steamAppId);
  });

  // POST /api/sync/steam-all-public (No API Key required) - Syncs all Steam games for user
  fastify.post('/steam-all-public', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    
    // Get user and their steamId
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { steamId: true }
    });

    if (!user?.steamId) {
      return { success: false, message: 'No Steam ID linked to profile.' };
    }

    // Get all user games that are Steam games
    const userGames = await (prisma as any).userGame.findMany({
      where: { 
        userId,
        game: { steamAppId: { not: null } }
      },
      include: { game: true }
    });

    if (userGames.length === 0) {
      return { success: true, count: 0, message: 'No Steam games found in library.' };
    }

    const { steamScraper } = await import('../services/steamScraperService.js');
    let successCount = 0;
    
    // Process in background or return early? 
    // We'll process them one by one but return a summary.
    // To avoid timeout, we might want to return { started: true } but user wants results.
    // Let's do them and return.
    for (const ug of userGames) {
      try {
        await steamScraper.syncAchievements(userId, ug.gameId, user.steamId, ug.game.steamAppId!.toString());
        successCount++;
      } catch (err) {
        console.error(`[SyncAll] Failed for ${ug.game.title}:`, err);
      }
    }

    return { 
      success: true, 
      count: successCount, 
      total: userGames.length,
      message: `Synced ${successCount} out of ${userGames.length} Steam games.` 
    };
  });
}
