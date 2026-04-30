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

    // Check if relationship already exists in EITHER direction
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return { message: 'Already friends' };
      if (existing.userId === userId) return { message: 'Request already sent' };
      
      // If the OTHER person already sent a request, auto-accept it!
      return await prisma.friend.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' }
      });
    }

    return await prisma.friend.create({
      data: { userId, friendId, status: 'PENDING' }
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

  /**
   * POST /api/social/friends/reject
   * Rejects or cancels a friend request / Unfriends
   */
  fastify.post('/friends/reject', async (request: any) => {
    const { userId, targetId } = request.body;
    return await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId: targetId },
          { userId: targetId, friendId: userId }
        ]
      }
    });
  });

  /**
   * GET /api/social/users/search
   * Searches for users by username
   */
  fastify.get('/users/search', async (request: any) => {
    const { query, currentUserId } = request.query;
    if (!query || query.length < 2) return [];

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query },
        NOT: { id: currentUserId }
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true
      },
      take: 10
    });

    // Check relationship status for each user
    const userIds = users.map(u => u.id);
    const relationships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: currentUserId, friendId: { in: userIds } },
          { userId: { in: userIds }, friendId: currentUserId }
        ]
      }
    });

    return users.map(u => {
      const rel = relationships.find(r => r.userId === u.id || r.friendId === u.id);
      let status = 'NONE';
      if (rel) {
        if (rel.status === 'ACCEPTED') status = 'FRIEND';
        else if (rel.userId === currentUserId) status = 'SENT';
        else status = 'PENDING';
      }
      return { ...u, relationship: status };
    });
  });

  /**
   * GET /api/social/friends/profile/:friendId
   * Returns a friend's in-app stats and trophies
   */
  fastify.get('/friends/profile/:friendId', async (request: any, reply) => {
    const { friendId } = request.params;
    const { userId } = request.query; // Current user

    // Verify friendship
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    if (!friendship) {
      return reply.status(403).send({ error: 'You are not friends with this user' });
    }

    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            games: true,
            achievements: true,
            badges: true
          }
        }
      }
    });

    // Get in-app trophies only
    const trophies = await prisma.userAchievement.findMany({
      where: { userId: friendId },
      include: {
        achievement: true
      },
      orderBy: { earnedAt: 'desc' },
      take: 20
    });

    // Get most played games (in-app stats)
    const games = await prisma.userGame.findMany({
      where: { userId: friendId },
      include: {
        game: { select: { title: true, coverUrl: true } }
      },
      orderBy: { totalPlaytime: 'desc' },
      take: 5
    });

    return {
      profile: friend,
      trophies,
      games
    };
  });
}
