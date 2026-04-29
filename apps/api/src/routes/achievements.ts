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
    const userId = (request.user as any).sub;
    const userGames = await prisma.userGame.findMany({
      where: { userId },
      include: { 
        game: {
          include: {
            gameAchievements: {
              where: { userId }
            }
          }
        }
      }
    });

    return userGames.map(ug => {
      const achievements = ug.game.gameAchievements;
      const earned = achievements.filter(a => a.isEarned).length;
      const total = achievements.length;
      return {
        gameId: ug.gameId,
        title: ug.game.title,
        coverUrl: ug.game.coverUrl,
        steamAppId: ug.game.steamAppId,
        earned,
        total,
        percentage: total > 0 ? Math.round((earned / total) * 100) : 0
      };
    }).filter(g => g.total > 0 || g.steamAppId);
  });

  // GET /api/achievements/:gameId - Get achievements for a specific game
  fastify.get('/:gameId', async (request: any) => {
    const userId = request.user.sub;
    const { gameId } = request.params;

    return await prisma.gameAchievement.findMany({
      where: { userId, gameId },
      orderBy: [
        { isEarned: 'desc' },
        { earnedAt: 'desc' }
      ]
    });
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
