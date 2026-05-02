import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

export default async function statsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', (fastify as any).authenticate);

  // GET /api/stats
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).sub;

    const totalGames = await prisma.userGame.count({ where: { userId } });
    const completedGames = await prisma.userGame.count({ where: { userId, status: 'completed' } });
    const playingGames = await prisma.userGame.count({ where: { userId, status: 'playing' } });

    const recentSessions = await prisma.playSession.findMany({
      where: { userId },
      take: 5,
      orderBy: { startTime: 'desc' },
      include: { game: true }
    });

    const totalPlaytime = await prisma.userGame.aggregate({
      where: { userId },
      _sum: { totalPlaytime: true }
    });

    // Time-based aggregates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [todaySessions, weekSessions] = await Promise.all([
      prisma.playSession.findMany({
        where: { userId, startTime: { gte: startOfToday } },
        select: { duration: true }
      }),
      prisma.playSession.findMany({
        where: { userId, startTime: { gte: startOfWeek } },
        select: { duration: true }
      })
    ]);

    const playtimeToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);
    const playtimeWeek = weekSessions.reduce((acc, s) => acc + s.duration, 0);

    return {
      success: true,
      data: {
        totalGames,
        completedGames,
        currentlyPlaying: playingGames,
        totalPlaytime: totalPlaytime._sum.totalPlaytime || 0,
        playtimeToday,
        playtimeWeek,
        recentSessions: recentSessions.map(s => ({
          id: s.id,
          gameName: s.game.title,
          duration: s.duration,
          startTime: s.startTime
        }))
      }
    };
  });

  // GET /api/stats/distribution
  fastify.get('/distribution', async (request: any, reply) => {
    const userId = request.user.sub;
    const distribution = await prisma.userGame.findMany({
      where: { userId, totalPlaytime: { gt: 0 } },
      select: {
        totalPlaytime: true,
        game: { select: { title: true } }
      },
      orderBy: { totalPlaytime: 'desc' },
      take: 10
    });

    return distribution.map(d => ({
      name: d.game.title,
      value: Math.round(d.totalPlaytime / 3600) // Hours
    }));
  });

  // GET /api/stats/weekly
  fastify.get('/weekly', async (request: any, reply) => {
    const userId = request.user.sub;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await prisma.playSession.findMany({
      where: { 
        userId, 
        startTime: { gte: sevenDaysAgo },
        duration: { gt: 0 }
      },
      select: {
        duration: true,
        startTime: true
      }
    });

    // Group by day
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }

    sessions.forEach(s => {
      const day = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayMap[day] !== undefined) {
        dayMap[day] += Math.round(s.duration / 60); // Minutes
      }
    });

    return Object.entries(dayMap).map(([day, minutes]) => ({
      day,
      minutes
    })).reverse();
  });

  // GET /api/stats/genres
  fastify.get('/genres', async (request: any, reply) => {
    const userId = request.user.sub;
    const userGames = await prisma.userGame.findMany({
      where: { userId },
      include: { game: true }
    });

    const genreMap: Record<string, number> = {};
    userGames.forEach(ug => {
      const genres = ug.game.genre ? ug.game.genre.split(',').map(g => g.trim()) : ['Unknown'];
      genres.forEach(genre => {
        genreMap[genre] = (genreMap[genre] || 0) + 1;
      });
    });

    return Object.entries(genreMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 now since we have more data points
  });

  // GET /api/stats/game/:gameId
  fastify.get('/game/:gameId', async (request: any, reply) => {
    const userId = request.user.sub;
    const { gameId } = request.params;

    // 1. Try finding by UserGame primary ID
    let userGame = await prisma.userGame.findUnique({
      where: { id: gameId },
      include: { game: true }
    });

    // 2. If not found and user matches, try finding by Game ID
    if (!userGame || userGame.userId !== userId) {
      userGame = await prisma.userGame.findUnique({
        where: { userId_gameId: { userId, gameId } },
        include: { game: true }
      });
    }

    if (!userGame) {
      return reply.code(404).send({ error: 'Game not found in your library' });
    }
    
    // Use the correctly resolved gameId for subsequent queries
    const resolvedGameId = userGame.gameId;

    // Stats calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const sessionsToday = await prisma.playSession.findMany({
      where: { userId, gameId: resolvedGameId, startTime: { gte: startOfToday } }
    });

    const sessionsWeek = await prisma.playSession.findMany({
      where: { userId, gameId: resolvedGameId, startTime: { gte: startOfWeek } }
    });

    const playtimeToday = sessionsToday.reduce((acc, s) => acc + s.duration, 0);
    const playtimeWeek = sessionsWeek.reduce((acc, s) => acc + s.duration, 0);

    const achievements = await prisma.gameAchievement.findMany({
      where: { userId, gameId: resolvedGameId }
    });

    const earnedCount = achievements.filter(a => a.isEarned).length;
    const totalCount = achievements.length;

    // Check for active session
    const activeSession = await prisma.playSession.findFirst({
      where: { userId, gameId: resolvedGameId, endTime: null },
      orderBy: { startTime: 'desc' }
    });

    const currentSessionDuration = activeSession 
      ? Math.floor((new Date().getTime() - new Date(activeSession.startTime).getTime()) / 1000)
      : 0;

    return {
      success: true,
      data: {
        gameTitle: userGame.game.title,
        totalPlaytime: userGame.totalPlaytime,
        playtimeToday,
        playtimeWeek,
        isRunning: !!activeSession,
        currentSessionDuration,
        achievements: {
          earned: earnedCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0,
          list: achievements.sort((a, b) => {
            if (a.isEarned && !b.isEarned) return -1;
            if (!a.isEarned && b.isEarned) return 1;
            return 0;
          }).slice(0, 20) // Top 20
        }
      }
    };
  });
}
