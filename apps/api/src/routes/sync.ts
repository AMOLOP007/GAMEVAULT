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

  // POST /api/sync/epic-id - Save the user's Epic Account ID
  fastify.post('/epic-id', async (request: FastifyRequest) => {
    const { epicId } = request.body as { epicId: string };
    const userId = (request.user as any).sub;
    if (!epicId) throw new Error('Epic Account ID is required');
    return await (prisma as any).user.update({
      where: { id: userId },
      data: { epicId }
    });
  });

  // POST /api/sync/gog-id - Save the user's GOG ID
  fastify.post('/gog-id', async (request: FastifyRequest) => {
    const { gogId } = request.body as { gogId: string };
    const userId = (request.user as any).sub;
    if (!gogId) throw new Error('GOG ID is required');
    return await (prisma as any).user.update({
      where: { id: userId },
      data: { gogId }
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

  // POST /api/sync/forensic - High-accuracy forensic reconstruction
  fastify.post('/forensic', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    const body = request.body as any;

    // SECURITY: Validate and sanitize inputs
    const appId = String(body.appId || '');
    const gameId = String(body.gameId || '');
    if (!appId || !gameId) {
      throw new Error('AppID and GameID are required for forensic sync');
    }

    const lastPlayed = Number(body.lastPlayed) || 0;
    const totalPlaytimeMinutes = Math.min(Math.max(0, Number(body.totalPlaytimeMinutes) || 0), 525600); // Cap at 1 year

    // SECURITY: Limit array sizes to prevent memory DoS
    const powerEvents = Array.isArray(body.powerEvents) ? body.powerEvents.slice(0, 500) : [];
    const steamLogs = Array.isArray(body.steamLogs) ? body.steamLogs.slice(0, 200) : [];

    // Resolve game: Desktop sends local SQLite IDs which differ from Postgres IDs.
    // Try steamAppId first (most reliable cross-DB identifier), then fall back to gameId.
    let resolvedGameId = gameId;
    const steamAppIdNum = parseInt(appId, 10);
    if (!isNaN(steamAppIdNum)) {
      const gameByAppId = await prisma.game.findFirst({
        where: { steamAppId: steamAppIdNum }
      });
      if (gameByAppId) resolvedGameId = gameByAppId.id;
    }

    // Calculate missed playtime
    const userGame = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId: resolvedGameId } },
      select: { totalPlaytime: true }
    });

    if (!userGame) {
      // Game not in user's library yet — skip silently (it will sync on next opportunity)
      return { success: false, missedSeconds: 0, reason: 'Game not yet in user library' };
    }

    const currentTotalSeconds = userGame?.totalPlaytime || 0;
    const steamTotalSeconds = totalPlaytimeMinutes * 60;
    const missedSeconds = steamTotalSeconds - currentTotalSeconds;

    if (missedSeconds > 60) {
      const { PredictionEngine } = await import('../services/predictionEngine.js');
      await PredictionEngine.reconstruct(userId, resolvedGameId, {
        lastPlayed,
        totalPlaytimeMinutes,
        powerEvents,
        steamLogs
      }, missedSeconds);

      // Update the total playtime in UserGame
      await prisma.userGame.update({
        where: { userId_gameId: { userId, gameId: resolvedGameId } },
        data: { totalPlaytime: steamTotalSeconds }
      });
    }

    return { success: true, missedSeconds };
  });

  // POST /api/sync/sessions - Sync local play sessions
  fastify.post('/sessions', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    const body = request.body as any;

    // SECURITY: Whitelist fields — never spread raw body into DB
    const startTime = new Date(body.startTime);
    if (isNaN(startTime.getTime())) throw new Error('Invalid startTime');

    const VALID_STATUSES = ['NORMAL', 'CRASH', 'FORCE_KILLED', 'VAULT_CLOSED', 'UNKNOWN'];
    const session = {
      id: String(body.id || ''),
      gameId: String(body.gameId || ''),
      startTime,
      endTime: body.endTime ? new Date(body.endTime) : null,
      lastHeartbeat: body.lastHeartbeat ? new Date(body.lastHeartbeat) : null,
      duration: Math.min(Math.max(0, Number(body.duration) || 0), 86400 * 7), // Cap at 7 days
      exitStatus: VALID_STATUSES.includes(body.exitStatus) ? body.exitStatus : 'UNKNOWN',
    };

    if (!session.gameId) throw new Error('gameId is required');

    // Resolve game ID mismatch between desktop SQLite and API Postgres
    let resolvedGameId = session.gameId;
    let userGame = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId: session.gameId } }
    });

    if (!userGame) {
      const game = await prisma.game.findUnique({ where: { id: session.gameId } });
      if (game) {
        resolvedGameId = game.id;
      } else {
        return { success: false, reason: 'Game not yet synced to server' };
      }
    }

    try {
      return await prisma.playSession.upsert({
        where: { id: session.id },
        create: { ...session, gameId: resolvedGameId, userId, synced: true },
        update: { ...session, gameId: resolvedGameId, userId, synced: true }
      });
    } catch (err: any) {
      if (err.code === 'P2003') {
        return { success: false, error: 'Game not found on server. Please sync the game first.' };
      }
      throw err;
    }
  });

  // POST /api/sync/achievements - Sync local achievements
  fastify.post('/achievements', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    const body = request.body as any;

    // SECURITY: Whitelist and sanitize fields — prevent arbitrary field injection
    const achievement = {
      gameId: String(body.gameId || ''),
      key: String(body.key || '').slice(0, 300),
      name: String(body.name || '').slice(0, 200),
      description: String(body.description || '').slice(0, 1000),
      iconUrl: String(body.iconUrl || '').slice(0, 500),
      isEarned: Boolean(body.isEarned),
      earnedAt: body.earnedAt ? new Date(body.earnedAt) : null,
      source: String(body.source || 'unknown').slice(0, 50),
    };

    if (!achievement.gameId || !achievement.key) {
      throw new Error('gameId and key are required');
    }

    // Verify the game belongs to the user's library
    // Desktop sends local SQLite IDs — try direct match first, then resolve by game lookup
    let userGame = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId: achievement.gameId } }
    });

    // If not found by direct ID, try finding the game and its userGame
    if (!userGame) {
      const game = await prisma.game.findUnique({ where: { id: achievement.gameId } });
      if (!game) {
        // Silently skip — game hasn't synced to API yet
        return { success: false, reason: 'Game not yet synced to server' };
      }
    }

    return await prisma.gameAchievement.upsert({
      where: {
        userId_gameId_key: {
          userId,
          gameId: achievement.gameId,
          key: achievement.key
        }
      },
      create: { ...achievement, userId },
      update: { ...achievement, userId }
    });
  });

  // POST /api/sync/epic - Trigger Epic Games Sync
  fastify.post('/epic', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    const { epicId, accessToken } = request.body as { epicId?: string; accessToken?: string };
    
    let targetEpicId = epicId;
    if (!targetEpicId) {
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });
      targetEpicId = user?.epicId;
    }

    if (!targetEpicId) throw new Error('Epic Account ID is required');

    const { EpicSyncService } = await import('../services/epicSyncService.js');
    return await EpicSyncService.syncEpicData(userId, targetEpicId, accessToken);
  });
}
