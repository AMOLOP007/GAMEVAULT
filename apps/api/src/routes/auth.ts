import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // GET /api/auth/me
  fastify.get('/me', { preHandler: [(fastify as any).authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).sub;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    return user;
  });

  // POST /api/auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'gamer@vault.com',
          username: 'VaultDweller',
          supabaseId: 'dev-user-id'
        }
      });
    }
    const token = fastify.jwt.sign({ sub: user.id });
    return { token, user };
  });

  // PUT /api/auth/profile
  fastify.put('/profile', { preHandler: [(fastify as any).authenticate] }, async (request: FastifyRequest) => {
    const userId = (request.user as any).sub;
    const { username, avatarUrl, steamId } = request.body as any;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(avatarUrl && { avatarUrl }),
        ...(steamId && { steamId })
      }
    });
  });
}
