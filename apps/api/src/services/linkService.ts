import prisma from '../lib/prisma.js';

export async function addExternalLink(userId: string, input: {
  userGameId: string;
  url: string;
  label: string;
  tag?: string;
}) {
  // Verify ownership
  const userGame = await prisma.userGame.findFirst({
    where: { id: input.userGameId, userId },
  });

  if (!userGame) throw new Error('Game not found in your library');

  return prisma.externalLink.create({
    data: {
      userGameId: input.userGameId,
      url: input.url,
      label: input.label,
      tag: input.tag || 'OTHER',
    },
  });
}

export async function removeExternalLink(userId: string, linkId: string) {
  const link = await prisma.externalLink.findUnique({
    where: { id: linkId },
    include: { userGame: true },
  });

  if (!link || link.userGame.userId !== userId) throw new Error('Link not found');

  await prisma.externalLink.delete({ where: { id: linkId } });
  return { deleted: true };
}

export async function getGameLinks(userId: string, userGameId: string) {
  const userGame = await prisma.userGame.findFirst({
    where: { id: userGameId, userId },
  });

  if (!userGame) throw new Error('Game not found in your library');

  return prisma.externalLink.findMany({
    where: { userGameId },
    // Removed orderBy createdAt as it's not in schema yet
  });
}
