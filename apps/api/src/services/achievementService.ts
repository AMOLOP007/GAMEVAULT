import prisma from '../lib/prisma.js';

export async function createAchievement(gameId: string, input: {
  key: string;
  title: string;
  description: string;
  iconUrl?: string;
  condition: string;
}) {
  return prisma.achievement.create({
    data: { gameId, ...input },
  });
}

export async function updateAchievementProgress(userId: string, userAchievementId: string, progress: number) {
  const ua = await prisma.userAchievement.findUnique({
    where: { id: userAchievementId },
    include: { userGame: true },
  });

  if (!ua || ua.userId !== userId) throw new Error('Achievement not found');

  return prisma.userAchievement.update({
    where: { id: userAchievementId },
    data: {
      progress: Math.min(100, Math.max(0, progress)),
      unlockedAt: progress >= 100 ? new Date() : null,
      earnedAt: progress >= 100 ? new Date() : undefined,
    },
  });
}

export async function getGameAchievements(gameId: string) {
  return prisma.achievement.findMany({
    where: { gameId },
    orderBy: { title: 'asc' },
  });
}
