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
        // Auto-set status to playing if on backlog
        ...(userGame.status.toLowerCase() === 'backlog' ? { status: 'playing' } : {}),
      },
    });

    totalSynced++;
  }

  return { synced: totalSynced };
}

export async function getActiveActivity(userId: string) {
  const activeSession = await prisma.playSession.findFirst({
    where: {
      userId,
      endTime: null,
      lastHeartbeat: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes window
      }
    },
    include: {
      userGame: { include: { game: true } }
    },
    orderBy: { startTime: 'desc' }
  });

  return activeSession;
}

export async function syncTotalPlaytime(userId: string, userGameId: string) {
  const userGame = await prisma.userGame.findUnique({
    where: { id: userGameId },
    include: { game: true, user: true }
  });

  if (!userGame || !userGame.user.steamId || !userGame.game.steamAppId) {
    return { success: false, message: 'Missing Steam information' };
  }

  const steamId = userGame.user.steamId;
  const appId = userGame.game.steamAppId;
  const apiKey = process.env.STEAM_API_KEY;

  let totalPlaytimeSeconds = 0;
  let success = false;

  // 1. Try Official Steam API first if key is available
  if (apiKey) {
    try {
      const { syncSteamAchievements } = await import('./steamSyncService.js');
      // We only want to sync this specific game's playtime
      const response = await (await import('axios')).default.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
        params: {
          key: apiKey,
          steamid: steamId,
          include_appinfo: 0,
          include_played_free_games: 1
        }
      });

      const steamGame = response.data?.response?.games?.find((g: any) => g.appid === appId);
      if (steamGame) {
        totalPlaytimeSeconds = steamGame.playtime_forever * 60;
        const playtime2WeeksSeconds = (steamGame.playtime_2weeks || 0) * 60;
        
        await (prisma.userGame.update as any)({
          where: { id: userGameId },
          data: { 
            totalPlaytime: totalPlaytimeSeconds > (userGame.totalPlaytime || 0) ? totalPlaytimeSeconds : undefined,
            playtime2Weeks: playtime2WeeksSeconds,
            // If they have playtime but it was BACKLOG, move to PLAYED or similar
            ...(userGame.status.toLowerCase() === 'backlog' && totalPlaytimeSeconds > 0 ? { status: 'played' } : {})
          }
        });
        
        // Also trigger prediction if there's missed playtime
        const localTotalSeconds = userGame.totalPlaytime || 0;
        const missedSeconds = totalPlaytimeSeconds - localTotalSeconds;
        if (missedSeconds > 300) {
          const { PredictionEngine } = await import('./predictionEngine.js');
          await PredictionEngine.predictAndDistribute(userId, userGame.gameId, missedSeconds, steamGame.playtime_last_played, playtime2WeeksSeconds);
        }

        return { success: true, playtime: totalPlaytimeSeconds };
      }
    } catch (err) {
      console.error(`[PlaytimeSync] Official API failed for ${appId}:`, err);
    }
  }

  // 2. Fallback to Scraper if official API failed or no key
  if (!success) {
    const { steamScraper } = await import('./steamScraperService.js');
    const result = await steamScraper.syncAchievements(
      userId, 
      userGame.gameId, 
      steamId, 
      appId.toString()
    );
    if (result.success) {
      totalPlaytimeSeconds = result.totalPlaytimeSeconds || 0;
      await (prisma.userGame.update as any)({
        where: { id: userGameId },
        data: { 
          totalPlaytime: totalPlaytimeSeconds > (userGame.totalPlaytime || 0) ? totalPlaytimeSeconds : undefined,
          // If they have playtime but it was BACKLOG, move to PLAYED or similar
          ...(userGame.status.toLowerCase() === 'backlog' && totalPlaytimeSeconds > 0 ? { status: 'played' } : {})
        }
      });
      return { success: true, playtime: totalPlaytimeSeconds };
    }
  }

  return { success: false };
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
