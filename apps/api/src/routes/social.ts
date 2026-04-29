import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function socialRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/social/activity
   * Returns a global feed of recent activities
   */
  fastify.get('/activity', async () => {
    return await prisma.activity.findMany({
      include: {
        user: {
          select: { username: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  });

  /**
   * GET /api/social/activity/friends/:userId
   * Returns activity feed for a user and their friends
   */
  fastify.get('/activity/friends/:userId', async (request: any) => {
    const { userId } = request.params;
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'ACCEPTED'
      }
    });
    const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);
    
    return await prisma.activity.findMany({
      where: {
        userId: { in: [userId, ...friendIds] }
      },
      include: {
        user: { select: { username: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  });

  /**
   * POST /api/social/activity
   * Records a new activity (played game, achievement, etc)
   */
  fastify.post('/activity', async (request: any) => {
    const { userId, type, gameId, metadata } = request.body;
    
    // If metadata contains gameTitle, we can use it for easier display
    const activity = await prisma.activity.create({
      data: {
        userId,
        type,
        gameId,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        user: { select: { username: true } }
      }
    });

    fastify.log.info(`[Social] Activity recorded: ${activity.user.username} ${type}`);
    return activity;
  });

  /**
   * GET /api/social/friends/:userId
   * Returns friend list
   */
  fastify.get('/friends/:userId', async (request: any) => {
    const { userId } = request.params;
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        friend: { select: { id: true, username: true, avatarUrl: true } }
      }
    });

    // Map to a clean list of friend profiles
    return friends.map(f => f.userId === userId ? f.friend : f.user);
  });

  /**
   * GET /api/social/friends/pending/:userId
   * Returns incoming friend requests
   */
  fastify.get('/friends/pending/:userId', async (request: any) => {
    const { userId } = request.params;
    return await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  });

  /**
   * POST /api/social/friends/request
   * Sends a friend request
   */
  fastify.post('/friends/request', async (request: any, reply) => {
    const { userId, friendId } = request.body;
    if (userId === friendId) return reply.status(400).send({ error: 'Cannot friend yourself' });

    return await prisma.friend.upsert({
      where: { userId_friendId: { userId, friendId } },
      update: { status: 'PENDING' },
      create: { userId, friendId, status: 'PENDING' }
    });
  });

  /**
   * POST /api/social/friends/accept
   * Accepts a friend request
   */
  fastify.post('/friends/accept', async (request: any) => {
    const { userId, friendId } = request.body; // userId is the one accepting
    return await prisma.friend.update({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      data: { status: 'ACCEPTED' }
    });
  });
}
