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
}
