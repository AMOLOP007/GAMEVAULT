import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // Get recent messages
  fastify.get('/messages', async (request, reply) => {
    const messages = await prisma.message.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });
    return { data: messages.reverse() };
  });

  // Post a message
  fastify.post('/messages', async (request, reply) => {
    const { content } = request.body as { content: string };
    const userId = (request.user as any).sub;

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Message content required' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });

    return { data: message };
  });
}
