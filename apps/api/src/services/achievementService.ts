import prisma from '../lib/prisma.js';

export const GLOBAL_MILESTONES = [
  { key: 'first_boot', title: 'First Boot', description: 'Launch the game for the first time', condition: { type: 'session_count', value: 1 } },
  { key: 'one_hour', title: 'Getting Started', description: 'Play for 1 hour', condition: { type: 'playtime_seconds', value: 3600 } },
  { key: 'ten_hours', title: 'Committed', description: 'Play for 10 hours', condition: { type: 'playtime_seconds', value: 36000 } },
  { key: 'marathon', title: 'Marathon Runner', description: 'Play for 4 hours in a single session', condition: { type: 'session_seconds', value: 14400 } },
];

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

export async function getGameAchievements(gameId: string, userId?: string) {
  // 1. Fetch official achievements (synced from Steam/Epic)
  const official = await prisma.gameAchievement.findMany({
    where: { gameId, userId },
  });

  // 2. Fetch/Seed internal achievements
  let internal = await prisma.achievement.findMany({
    where: { gameId },
    include: {
      earned: userId ? { where: { userId } } : false
    }
  });

  // 3. If no internal achievements exist, seed them from milestones
  if (internal.length === 0) {
    for (const milestone of GLOBAL_MILESTONES) {
      await (prisma.achievement as any).create({
        data: {
          gameId,
          key: milestone.key,
          title: milestone.title,
          description: milestone.description,
          condition: JSON.stringify(milestone.condition),
          source: 'internal'
        }
      });
    }
    internal = await prisma.achievement.findMany({
      where: { gameId },
      include: {
        earned: userId ? { where: { userId } } : false
      }
    });
  }

  return {
    official: official.map(a => ({
      id: a.id,
      key: a.key,
      title: a.name,
      description: a.description,
      iconUrl: a.iconUrl,
      isEarned: a.isEarned,
      earnedAt: a.earnedAt,
      source: a.source
    })),
    internal: internal.map(a => ({
      id: a.id,
      key: a.key,
      title: a.title,
      description: a.description,
      iconUrl: a.iconUrl,
      isEarned: a.earned && a.earned.length > 0,
      earnedAt: a.earned?.[0]?.earnedAt,
      source: 'internal'
    }))
  };
}

export async function checkAndUnlockMilestones(userId: string, gameId: string, stats: { totalPlaytime: number, sessionPlaytime: number, sessionCount: number }) {
  const unearned = await (prisma.achievement as any).findMany({
    where: {
      gameId,
      source: 'internal',
      earned: { none: { userId } }
    }
  });

  const unlocked = [];

  for (const ach of unearned) {
    const condition = JSON.parse(ach.condition);
    let isEarned = false;

    switch (condition.type) {
      case 'playtime_seconds':
        if (stats.totalPlaytime >= condition.value) isEarned = true;
        break;
      case 'session_seconds':
        if (stats.sessionPlaytime >= condition.value) isEarned = true;
        break;
      case 'session_count':
        if (stats.sessionCount >= condition.value) isEarned = true;
        break;
    }

    if (isEarned) {
      const ua = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
          earnedAt: new Date(),
          unlockedAt: new Date(),
          progress: 100
        }
      });
      unlocked.push({ ...ach, earnedAt: ua.earnedAt });
    }
  }

  return unlocked;
}
