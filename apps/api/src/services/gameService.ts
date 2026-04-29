import prisma from '../lib/prisma.js';

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Helper to parse JSON string arrays from SQLite
function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

export async function getUserGames(userId: string, filters?: { status?: string; genre?: string; platform?: string; search?: string }) {
  const where: any = { userId };

  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.game = { title: { contains: filters.search } };
  }

  const results = await prisma.userGame.findMany({
    where,
    include: {
      game: true,
      _count: { select: { playSessions: true, externalLinks: true, userAchievements: true } },
    },
    orderBy: { lastPlayedAt: { sort: 'desc', nulls: 'last' } as any },
  });

  // Apply genre/platform filters in JS (SQLite doesn't support array has)
  let filtered = results;
  if (filters?.genre) {
    filtered = filtered.filter((ug) => {
      const genres = parseJsonArray(ug.game.genre);
      return genres.some((g) => g.toLowerCase() === filters.genre!.toLowerCase());
    });
  }
  if (filters?.platform) {
    filtered = filtered.filter((ug) => {
      const platforms = parseJsonArray(ug.game.platform);
      return platforms.some((p) => p.toLowerCase() === filters.platform!.toLowerCase());
    });
  }

  return filtered;
}

export async function getGameDetails(userId: string, userGameId: string) {
  const userGame = await prisma.userGame.findFirst({
    where: { id: userGameId, userId },
    include: {
      game: { include: { achievements: true } },
      playSessions: { orderBy: { startTime: 'desc' }, take: 20 },
      externalLinks: true,
      userAchievements: { include: { achievement: true } },
    },
  });

  if (!userGame) throw new Error('Game not found in your library');
  return userGame;
}

export async function addGameToLibrary(userId: string, input: {
  title: string;
  description?: string;
  coverUrl?: string;
  genre?: string[];
  platform?: string[];
  developer?: string;
  publisher?: string;
  status?: string;
  processName?: string;
}) {
  const slug = slugify(input.title);

  // Find or create the master game record
  let game = await prisma.game.findUnique({ where: { slug } });

  if (!game) {
    game = await prisma.game.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        coverUrl: input.coverUrl,
        genre: JSON.stringify(input.genre || []),
        platform: JSON.stringify(input.platform || []),
        developer: input.developer,
        publisher: input.publisher,
      },
    });
  }

  // Create user-game association
  const userGame = await prisma.userGame.create({
    data: {
      userId,
      gameId: game.id,
      status: input.status || 'BACKLOG',
      processName: input.processName,
    },
    include: { game: true },
  });

  return userGame;
}

export async function updateUserGame(userId: string, userGameId: string, input: {
  status?: string;
  rating?: number;
  notes?: string;
  isFavorite?: boolean;
  processName?: string;
}) {
  const existing = await prisma.userGame.findFirst({ where: { id: userGameId, userId } });
  if (!existing) throw new Error('Game not found in your library');

  return prisma.userGame.update({
    where: { id: userGameId },
    data: input,
    include: { game: true },
  });
}

export async function removeFromLibrary(userId: string, userGameId: string) {
  const existing = await prisma.userGame.findFirst({ where: { id: userGameId, userId } });
  if (!existing) throw new Error('Game not found in your library');

  await prisma.userGame.delete({ where: { id: userGameId } });
  return { deleted: true };
}
