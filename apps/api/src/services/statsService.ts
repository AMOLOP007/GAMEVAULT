import prisma from '../lib/prisma.js';

export async function getDashboardStats(userId: string) {
  const [totalGames, completedGames, currentlyPlaying, allGames, recentSessions] = await Promise.all([
    prisma.userGame.count({ where: { userId } }),
    prisma.userGame.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.userGame.count({ where: { userId, status: 'PLAYING' } }),
    prisma.userGame.findMany({
      where: { userId },
      include: { game: { select: { id: true, title: true, coverUrl: true } } },
      orderBy: { totalPlaytime: 'desc' },
      take: 5,
    }),
    prisma.playSession.findMany({
      where: { userId },
      include: { userGame: { include: { game: { select: { title: true } } } } },
      orderBy: { startTime: 'desc' },
      take: 10,
    }),
  ]);

  const totalPlaytime = allGames.reduce((sum: number, g: any) => sum + g.totalPlaytime, 0);

  return {
    totalPlaytime,
    totalGames,
    completedGames,
    currentlyPlaying,
    mostPlayed: allGames.map((ug: any) => ({
      game: ug.game,
      totalPlaytime: ug.totalPlaytime,
    })),
    recentSessions: recentSessions.map((s: any) => ({
      id: s.id,
      gameName: s.userGame?.game?.title || 'Unknown Game',
      duration: s.duration,
      startTime: s.startTime.toISOString(),
    })),
  };
}

export async function getWeeklyStats(userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await prisma.playSession.findMany({
    where: { userId, startTime: { gte: sevenDaysAgo } },
    orderBy: { startTime: 'asc' },
  });

  // Group by date
  const dayMap = new Map<string, { totalSeconds: number; sessions: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { totalSeconds: 0, sessions: 0 });
  }

  for (const session of sessions) {
    const key = session.startTime.toISOString().split('T')[0];
    const existing = dayMap.get(key);
    if (existing) {
      existing.totalSeconds += session.duration;
      existing.sessions += 1;
    }
  }

  return {
    days: Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .reverse(),
  };
}
