import prisma from '../lib/prisma.js';

export async function logPlaySessions(userId: string, sessions: Array<{
  userGameId: string;
  processName?: string;
  startTime: string;
  endTime: string;
  duration: number;
}>) {
  let totalSynced = 0;

  for (const session of sessions) {
    // Verify ownership
    const userGame = await prisma.userGame.findFirst({
      where: { id: session.userGameId, userId },
    });

    if (!userGame) continue;

    await prisma.playSession.create({
      data: {
        userId,
        gameId: userGame.gameId,
        userGameId: session.userGameId,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        duration: session.duration,
      },
    });

    // Update total playtime and last played
    await prisma.userGame.update({
      where: { id: session.userGameId },
      data: {
        totalPlaytime: { increment: session.duration },
        lastPlayedAt: new Date(session.endTime),
        lastPlayed: new Date(session.endTime),
        // Auto-set status to PLAYING if on backlog
        ...(userGame.status === 'BACKLOG' ? { status: 'PLAYING' } : {}),
      },
    });

    totalSynced++;
  }

  return { synced: totalSynced };
}

export async function getGamePlaySessions(userId: string, userGameId: string) {
  const userGame = await prisma.userGame.findFirst({
    where: { id: userGameId, userId },
  });

  if (!userGame) throw new Error('Game not found in your library');

  return prisma.playSession.findMany({
    where: { userGameId },
    orderBy: { startTime: 'desc' },
    take: 50,
  });
}
