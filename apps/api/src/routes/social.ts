import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function socialRoutes(fastify: FastifyInstance) {
  /**
   * Helper to resolve Supabase UUID to internal CUID
   */
  async function resolveId(id: string): Promise<string> {
    if (!id) return '';
    // If it's already a CUID (NanoID/CUID usually start with 'c' or are non-UUID format), but we'll check DB anyway
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: id },
          { supabaseId: id }
        ]
      },
      select: { id: true }
    });
    return user?.id || id;
  }

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
    const userId = await resolveId(request.params.userId);
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
    const { type, gameId, metadata } = request.body;
    const userId = await resolveId(request.body.userId);
    
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
    const userId = await resolveId(request.params.userId);
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

    return friends.map(f => f.userId === userId ? f.friend : f.user);
  });

  /**
   * GET /api/social/friends/pending/:userId
   * Returns incoming friend requests (filtered by 24h expiration)
   */
  fastify.get('/friends/pending/:userId', async (request: any) => {
    const userId = await resolveId(request.params.userId);
    const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'PENDING',
        createdAt: { gte: expirationDate }
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  });

  /**
   * GET /api/social/friends/outgoing/:userId
   * Returns outgoing friend requests (filtered by 24h expiration)
   */
  fastify.get('/friends/outgoing/:userId', async (request: any) => {
    const userId = await resolveId(request.params.userId);
    const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await prisma.friend.findMany({
      where: {
        userId: userId,
        status: 'PENDING',
        createdAt: { gte: expirationDate }
      },
      include: {
        friend: { select: { id: true, username: true, avatarUrl: true } }
      }
    });
  });

  /**
   * POST /api/social/friends/request
   * Sends a friend request
   */
  fastify.post('/friends/request', async (request: any, reply) => {
    const userId = await resolveId(request.body.userId);
    const friendId = await resolveId(request.body.friendId);
    
    if (userId === friendId) return reply.status(400).send({ error: 'Cannot friend yourself' });

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
      
      const isExpired = existing.status === 'PENDING' && 
                        new Date(existing.createdAt).getTime() < (Date.now() - 24 * 60 * 60 * 1000);
      
      if (isExpired) {
        // Delete expired request to allow a fresh one
        await prisma.friend.delete({ where: { id: existing.id } });
      } else {
        if (existing.userId === userId) return { message: 'Request already sent' };
        // If they sent us a request, auto-accept
        return await prisma.friend.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED' }
        });
      }
    }

    try {
      return await prisma.friend.create({
        data: { userId, friendId, status: 'PENDING' }
      });
    } catch (err: any) {
      if (err.code === 'P2002') return { message: 'Relationship already exists' };
      throw err;
    }
  });

  /**
   * POST /api/social/friends/accept
   * Accepts a friend request
   */
  fastify.post('/friends/accept', async (request: any, reply) => {
    const userId = await resolveId(request.body.userId);
    const friendId = await resolveId(request.body.friendId);

    try {
      return await prisma.friend.update({
        where: { userId_friendId: { userId: friendId, friendId: userId } },
        data: { status: 'ACCEPTED' }
      });
    } catch (err: any) {
      return reply.status(404).send({ error: 'Request not found' });
    }
  });

  /**
   * POST /api/social/friends/reject
   * Rejects or cancels a friend request / Unfriends
   */
  fastify.post('/friends/reject', async (request: any) => {
    const userId = await resolveId(request.body.userId);
    const targetId = await resolveId(request.body.targetId);

    fastify.log.info(`[SOCIAL_CMD] Reject/Cancel: ${userId} -> ${targetId}`);

    try {
      const result = await prisma.friend.deleteMany({
        where: {
          OR: [
            { userId, friendId: targetId },
            { userId: targetId, friendId: userId }
          ]
        }
      });
      fastify.log.info(`[SOCIAL_CMD] Deleted ${result.count} relationships`);
      return { message: 'Relationship removed' };
    } catch (err: any) {
      fastify.log.error(`[SOCIAL_CMD] Reject failed: ${err.message}`);
      return { message: 'Nothing to remove' };
    }
  });

  /**
   * GET /api/social/users/search
   * Searches for users by username (with 24h expiration check)
   */
  fastify.get('/users/search', async (request: any) => {
    const { query } = request.query;
    const currentUserId = await resolveId(request.query.currentUserId);
    const expirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    fastify.log.info(`[SOCIAL_SEARCH] Query: "${query}" from user ${currentUserId}`);

    if (!query || query.length < 2) return [];

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query },
        NOT: { id: currentUserId }
      },
      select: { id: true, username: true, avatarUrl: true, createdAt: true },
      take: 10
    });

    const userIds = users.map(u => u.id);
    const relationships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: currentUserId, friendId: { in: userIds } },
          { userId: { in: userIds }, friendId: currentUserId }
        ]
      }
    });

    fastify.log.info(`[SOCIAL_SEARCH] Found ${users.length} users, ${relationships.length} relationships`);

    return users.map(u => {
      const rel = relationships.find(r => r.userId === u.id || r.friendId === u.id);
      let status = 'NONE';
      
      if (rel) {
        const isExpired = rel.status === 'PENDING' && new Date(rel.createdAt).getTime() < expirationDate.getTime();
        
        if (!isExpired) {
          if (rel.status === 'ACCEPTED') status = 'FRIEND';
          else if (rel.userId === currentUserId) status = 'SENT';
          else status = 'PENDING';
        }
      }
      return { ...u, relationship: status };
    });
  });

  /**
   * GET /api/social/friends/profile/:friendId
   * Returns a friend's in-app stats and trophies
   */
  fastify.get('/friends/profile/:friendId', async (request: any, reply) => {
    const friendId = await resolveId(request.params.friendId);
    const userId = await resolveId(request.query.userId);

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
        id: true, username: true, avatarUrl: true, createdAt: true,
        _count: { select: { games: true, achievements: true, badges: true } }
      }
    });

    const trophies = await prisma.userAchievement.findMany({
      where: { userId: friendId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
      take: 20
    });

    const games = await prisma.userGame.findMany({
      where: { userId: friendId },
      include: { game: { select: { title: true, coverUrl: true } } },
      orderBy: { totalPlaytime: 'desc' },
      take: 5
    });

    return { profile: friend, trophies, games };
  });
}
