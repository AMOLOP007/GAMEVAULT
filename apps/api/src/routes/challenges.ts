import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function challengeRoutes(fastify: FastifyInstance) {
  // GET /api/challenges - Get all challenges and user's progress
  fastify.get('/', { preHandler: [(fastify as any).authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const allChallenges = await (prisma as any).challenge.findMany();
      const userChallenges = await (prisma as any).userChallenge.findMany({
        where: { userId },
        include: { challenge: true }
      });

      const result = allChallenges.map((challenge: any) => {
        const userProgress = userChallenges.find((uc: any) => uc.challengeId === challenge.id);
        return {
          ...challenge,
          currentProgress: userProgress?.currentProgress || 0,
          status: userProgress?.status || 'ACTIVE',
          completedAt: userProgress?.completedAt || null,
          streakCount: userProgress?.streakCount || 0
        };
      });

      return result;
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });
}
