import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function playtimeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);

  // GET /api/playtime/:gameId
  fastify.get('/:gameId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { gameId } = request.params as { gameId: string };
    const userId = (request.user as any).sub;
    
    // Resolve the actual gameId
    let userGame = await prisma.userGame.findUnique({
      where: { id: gameId },
    });

    if (!userGame || userGame.userId !== userId) {
      userGame = await prisma.userGame.findUnique({
        where: { userId_gameId: { userId, gameId } },
      });
    }

    if (!userGame) {
      return reply.code(404).send({ error: 'Game not found in library' });
    }

    return prisma.playSession.findMany({
      where: { userId, gameId: userGame.gameId },
      orderBy: { startTime: 'desc' }
    });
  });

  // POST /api/playtime/sync
  fastify.post('/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const { gameId, startTime, duration } = request.body as any;
    const userId = (request.user as any).sub;

    const session = await prisma.playSession.create({
      data: {
        userId,
        gameId,
        startTime: new Date(startTime),
        endTime: new Date(new Date(startTime).getTime() + duration * 1000),
        duration,
        synced: true
      }
    });

    // Check for challenges
    const { vaultChallenges } = await import('../services/vaultChallengesService.js');
    const unlocked = await vaultChallenges.checkChallenges(userId, gameId, { duration });

    return { success: true, data: session, unlocked };
  });
}
