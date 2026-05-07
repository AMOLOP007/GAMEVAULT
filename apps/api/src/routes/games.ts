import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import axios from 'axios';
import { hydrateGameMetadata, hydrateAllMissingMetadata } from '../services/metadataService.js';

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);

  // GET /api/games
  fastify.get('/', async (request: any, reply) => {
    const userId = request.user.sub;
    const { status, excludeStatus, search, is100Percent, wouldReplay } = request.query as any;

    const where: any = { userId };
    if (status) where.status = status;
    if (excludeStatus && !status) where.status = { not: excludeStatus };
    if (is100Percent === 'true') where.is100Percent = true;
    if (wouldReplay === 'true') where.wouldReplay = true;

    if (search) {
      where.game = {
        title: { contains: search }
      };
    }

    return prisma.userGame.findMany({
      where,
      include: { game: true }
    });
  });

  // GET /api/games/search
  fastify.get('/search', async (request: any, reply) => {
    const { q } = request.query as { q: string };
    if (!q) return reply.code(400).send({ error: 'Query parameter "q" is required' });
    
    const RAWG_API_KEY = process.env.RAWG_API_KEY;
    const response = await axios.get(`https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&key=${RAWG_API_KEY}`);
    
    // Normalize RAWG results for our frontend
    const results = response.data.results.map((game: any) => ({
      rawgId: game.id,
      title: game.name,
      coverUrl: game.background_image,
      genre: game.genres?.map((g: any) => g.name) || [],
      platform: game.platforms?.map((p: any) => p.platform.name) || []
    }));

    return results;
  });

  // POST /api/games/detect
  fastify.post('/detect', async (request: any, reply) => {
    const { title, exePath, processName } = request.body;
    const userId = request.user.sub;

    // Logic to handle detected game (e.g. prompt user or auto-add)
    // For now, just return a success
    return { status: 'detected', title };
  });

  // POST /api/games
  fastify.post('/', async (request: any, reply) => {
    const { 
      title, exePath, processName, coverUrl, iconUrl,
      steamAppId, epicAppId, gogAppId, source, launchUri,
      totalPlaytime, playtime2Weeks
    } = request.body;
    const userId = request.user.sub;

    // Use a transaction or a very robust check to handle concurrency
    let game = await prisma.game.findFirst({
      where: {
        OR: [
          ...(steamAppId ? [{ steamAppId: Number(steamAppId) }] : []),
          ...(epicAppId ? [{ epicAppId }] : []),
          { title }
        ]
      }
    });

    if (!game) {
      try {
        game = await prisma.game.create({
          data: { 
            title, exePath, processName, 
            coverUrl: coverUrl || iconUrl,
            steamAppId: steamAppId ? Number(steamAppId) : null, 
            epicAppId, gogAppId, source, launchUri
          }
        });
      } catch (err: any) {
        // Handle unique constraint violations (e.g. same title or same exePath)
        if (err.code === 'P2002') {
          game = await prisma.game.findFirst({ 
            where: { 
              OR: [
                { title },
                ...(exePath ? [{ exePath }] : [])
              ]
            } 
          });
          
          // If we found the game by exePath but the title was different (e.g. from an older scanner version)
          // Update the title to the better one discovered now
             game = await prisma.game.update({
               where: { id: game.id },
               data: { title }
             });
          }
        } else {
          console.error('[API] Unexpected error during game creation:', err);
          throw err;
        }
      }
    }

    if (!game) {
      console.error(`[API] Failed to resolve or create game: ${title}`, { exePath, steamAppId, epicAppId });
      throw new Error('Failed to resolve or create game');
    }

    // Ensure metadata hydration is triggered (covers both new creations and P2002 resolutions)
    hydrateGameMetadata(game.id).catch(console.error);

    // Add to user library using upsert to handle concurrency
    const { getActiveActivity } = await import('../services/playtimeService.js');
    const active = await getActiveActivity(userId);
    const initialStatus = (active?.gameId === game.id) ? 'playing' : (request.body.status || 'backlog');

    const userGame = await prisma.userGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: {
        totalPlaytime: totalPlaytime ? Number(totalPlaytime) : undefined,
        playtime2Weeks: playtime2Weeks ? Number(playtime2Weeks) : undefined,
        // If it's already there, only update status to playing if it was backlog and they are currently playing it
        ...(active?.gameId === game.id ? { status: 'playing' } : {})
      },
      create: { 
        userId, 
        gameId: game.id,
        status: initialStatus,
        totalPlaytime: totalPlaytime ? Number(totalPlaytime) : 0,
        playtime2Weeks: playtime2Weeks ? Number(playtime2Weeks) : 0
      }
    });

    // ── TRIGGER PREDICTION ENGINE ──
    if (totalPlaytime && Number(totalPlaytime) > 0) {
      const { PredictionEngine } = await import('../services/predictionEngine.js');
      // Use now as lastPlayed if not provided
      const lastPlayed = new Date(); 
      PredictionEngine.predictAndDistribute(
        userId, 
        game.id, 
        Number(totalPlaytime), 
        Math.floor(lastPlayed.getTime() / 1000), 
        Number(playtime2Weeks || 0)
      ).catch(err => console.error('[Prediction] Failed:', err));
    }

    return userGame;
  });

  // DELETE /api/games/:id
  fastify.delete('/:id', async (request: any, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;

    // The ID could be a Game ID or a UserGame ID.
    // Try finding by Game ID first as it's the standard for the frontend.
    const userGame = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId: id } }
    });

    if (!userGame) {
      // Try finding by UserGame ID as a fallback
      const ugById = await prisma.userGame.findUnique({
        where: { id }
      });
      
      if (!ugById || ugById.userId !== userId) {
        return reply.code(404).send({ error: 'Game not found in your vault' });
      }
      
      // Found by UserGame ID
      await prisma.externalLink.deleteMany({ where: { userGameId: ugById.id } });
      await prisma.userGame.delete({ where: { id: ugById.id } });
    } else {
      // Found by Game ID
      await prisma.externalLink.deleteMany({ where: { userGameId: userGame.id } });
      await prisma.userGame.delete({ where: { id: userGame.id } });
    }

    return { success: true, message: 'Game removed from vault' };
  });

  // DELETE /api/games/clear
  fastify.delete('/clear', async (request: any, reply) => {
    const userId = request.user.sub;
    await prisma.userGame.deleteMany({
      where: { userId }
    });
    return { success: true, message: 'Library cleared' };
  });

  // GET /api/games/hydrate-all
  fastify.get('/hydrate-all', async (request, reply) => {
    hydrateAllMissingMetadata().catch(console.error);
    return { success: true, message: 'Hydration started in background' };
  });

  // PATCH /api/games/:id
  fastify.patch('/:id', async (request: any, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const { status, totalPlaytime, rating, notes, is100Percent, wouldReplay } = request.body;
    
    const data = { status, totalPlaytime, rating, notes, is100Percent, wouldReplay };

    // Try finding by UserGame ID
    const userGame = await prisma.userGame.findUnique({ where: { id } });
    if (userGame && userGame.userId === userId) {
      return prisma.userGame.update({ where: { id }, data });
    }

    // Fallback to Game ID
    return prisma.userGame.update({
      where: { userId_gameId: { userId, gameId: id } },
      data
    });
  });

  // GET /api/games/:id
  fastify.get('/:id', async (request: any, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;
    
    // 1. Try finding by UserGame primary ID
    let userGame = await prisma.userGame.findUnique({
      where: { id },
      include: { game: true }
    });

    // 2. If not found and user matches, try finding by Game ID
    if (!userGame || userGame.userId !== userId) {
      userGame = await prisma.userGame.findUnique({
        where: { userId_gameId: { userId, gameId: id } },
        include: { 
          game: true,
          playSessions: { orderBy: { startTime: 'desc' }, take: 20 },
          externalLinks: true
        }
      }) as any;
    } else {
      // Re-fetch with relations if found by ID
      userGame = await prisma.userGame.findUnique({
        where: { id: userGame.id },
        include: { 
          game: true,
          playSessions: { orderBy: { startTime: 'desc' }, take: 20 },
          externalLinks: true
        }
      }) as any;
    }

    if (!userGame) return reply.code(404).send({ error: 'Game not found in library' });

    // Also fetch achievements (stored in GameAchievement table linked by gameId and userId)
    const achievements = await prisma.gameAchievement.findMany({
      where: { userId, gameId: userGame.gameId },
      orderBy: { isEarned: 'desc' }
    });

    return {
      ...userGame,
      userAchievements: achievements
    };
  });

  // GET /api/games/:id/launch-info
  // Returns resolved launch config for a game (for UI display only — does not launch)
  fastify.get<{ Params: { id: string } }>(
    '/:id/launch-info',
    async (request: any, reply) => {
      const { id } = request.params
      const userId = request.user.sub

      // Resolve the actual userGame record
      let userGame = await prisma.userGame.findUnique({
        where: { id },
        include: { game: true }
      });

      if (!userGame || userGame.userId !== userId) {
        userGame = await prisma.userGame.findUnique({
          where: { userId_gameId: { userId, gameId: id } },
          include: { game: true }
        });
      }

      if (!userGame) {
        return reply.code(404).send({ error: 'Game not found in your library' })
      }

      const game = userGame.game

      // Determine available launch methods for display
      const availableMethods: string[] = []
      if (game.steamAppId)  availableMethods.push('steam')
      if (game.epicAppId)   availableMethods.push('epic')
      if (game.gogAppId)    availableMethods.push('gog')
      if (game.launchUri)   availableMethods.push('uri')
      if (game.exePath)     availableMethods.push('exe')

      const primaryMethod = availableMethods[0] ?? null

      return reply.send({
        gameId: id,
        title: game.title,
        primaryMethod,
        availableMethods,
        hasExePath: !!game.exePath,
        exePath: game.exePath ?? null,
        steamAppId: game.steamAppId ?? null,
        epicAppId: game.epicAppId ?? null,
        gogAppId: game.gogAppId ?? null,
      })
    }
  )

  // POST /api/games/:id/sync-metadata
  fastify.post('/:id/sync-metadata', async (request: any, reply) => {
    const { id } = request.params;
    
    // First, try to find by Game ID or RAWG ID
    let game = await prisma.game.findFirst({
      where: {
        OR: [
          { id },
          { rawgId: id }
        ]
      }
    });

    // If not found, it might be a UserGame ID from the frontend
    if (!game) {
      const userGame = await prisma.userGame.findUnique({
        where: { id },
        include: { game: true }
      });
      if (userGame) {
        game = userGame.game;
      }
    }

    if (!game) {
      return reply.code(404).send({ error: 'Game not found for synchronization' });
    }

    try {
      await hydrateGameMetadata(game.id);
      
      // If it's a UserGame context, also sync lifetime playtime
      const userGame = await prisma.userGame.findFirst({
        where: { userId: request.user.sub, gameId: game.id }
      });
      
      if (userGame) {
        const { syncTotalPlaytime } = await import('../services/playtimeService.js');
        await syncTotalPlaytime(request.user.sub, userGame.id);
      }

      return { success: true, gameId: game.id };
    } catch (err: any) {
      request.log.error(`Metadata sync failed for ${game.id}: ${err.message}`);
      return reply.code(500).send({ error: 'Failed to sync metadata. RAWG API might be unavailable or limits reached.' });
    }
  });
}
