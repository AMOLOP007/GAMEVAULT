import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function badgeRoutes(fastify: FastifyInstance) {
  // GET /api/badges - Get all badges and user's unlock status
  fastify.get('/', { preHandler: [(fastify as any).authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const allBadges = await (prisma as any).badge.findMany();
      const userBadges = await (prisma as any).userBadge.findMany({
        where: { userId }
      });

      const unlockedBadgeIds = new Set(userBadges.map((ub: any) => ub.badgeId));

      const result = allBadges.map((badge: any) => ({
        ...badge,
        isUnlocked: unlockedBadgeIds.has(badge.id),
        unlockedAt: userBadges.find((ub: any) => ub.badgeId === badge.id)?.unlockedAt || null
      }));

      return result;
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/badges - Unlock a badge
  fastify.post('/', { preHandler: [(fastify as any).authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const { badgeId } = request.body as { badgeId: string };
      
      // Check if already unlocked
      const existing = await (prisma as any).userBadge.findUnique({
        where: {
          userId_badgeId: { userId, badgeId }
        }
      });
      
      if (existing) {
        return existing;
      }
      
      const userBadge = await (prisma as any).userBadge.create({
        data: {
          userId,
          badgeId,
          unlockedAt: new Date()
        }
      });
      
      return userBadge;
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  });
}
