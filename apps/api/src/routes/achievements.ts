import { FastifyInstance, FastifyRequest } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function achievementRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);

  // GET /api/achievements - Get all achievements for the user
  fastify.get('/', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    return await prisma.gameAchievement.findMany({
      where: { userId },
      include: { game: true },
      orderBy: { earnedAt: 'desc' }
    });
  });

  // GET /api/achievements/stats - Get achievement stats per game
  fastify.get('/stats', async (request: FastifyRequest) => {
    try {
      const userId = (request.user as any).sub;
      const userGames = await prisma.userGame.findMany({
        where: { userId },
        include: { 
          game: {
            include: {
              gameAchievements: {
                where: { userId }
              },
              achievements: {
                include: {
                  earned: { where: { userId } }
                }
              }
            }
          }
        }
      });

      return userGames.map(ug => {
        // 1. Official Trophies (Steam/Epic)
        const official = ug.game.gameAchievements;
        const officialEarned = official.filter(a => a.isEarned).length;
        const officialTotal = official.length;

        // 2. Internal Milestones (Vault)
        const internal = ug.game.achievements;
        const internalEarned = internal.filter(a => a.earned && a.earned.length > 0).length;
        const internalTotal = internal.length;

        const totalEarned = officialEarned + internalEarned;
        const totalCount = officialTotal + internalTotal;

        return {
          gameId: ug.gameId,
          title: ug.game.title,
          coverUrl: ug.game.coverUrl,
          steamAppId: ug.game.steamAppId,
          earned: totalEarned,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((totalEarned / totalCount) * 100) : 0
        };
      }).filter(g => g.total > 0 || g.steamAppId || g.gameId);
    } catch (err: any) {
      request.log.error(`Failed to get achievement stats: ${err.message}`);
      throw err;
    }
  });

  // POST /api/achievements/check - Check for milestone achievements
  fastify.post('/check', async (request: any) => {
    const userId = request.user.sub;
    const { gameId, stats } = request.body;
    const { checkAndUnlockMilestones } = await import('../services/achievementService.js');
    
    const unlocked = await checkAndUnlockMilestones(userId, gameId, stats);
    return { unlocked };
  });

  // GET /api/achievements/:gameId - Get achievements for a specific game (Unified)
  fastify.get('/:gameId', async (request: any) => {
    const userId = request.user.sub;
    const { gameId } = request.params;
    const { getGameAchievements } = await import('../services/achievementService.js');

    return await getGameAchievements(gameId, userId);
  });

  // GET /api/achievements/vault - Get only vault challenges
  fastify.get('/vault', async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    return await prisma.gameAchievement.findMany({
      where: { userId, source: 'vault' },
      orderBy: { earnedAt: 'desc' }
    });
  });
}
