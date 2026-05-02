import axios from 'axios';
import prisma from '../lib/prisma.js';
import pLimit from 'p-limit';
const limit = pLimit(2); // Max 2 concurrent Steam API requests

const STEAM_REQUESTS_PER_SECOND = 8;
const MAX_GAMES_PER_SYNC = 200;

export async function syncSteamAchievements(userId: string, steamId: string, apiKey: string) {
  try {
    // 1. Fetch user's owned games
    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
      params: {
        key: apiKey,
        steamid: steamId,
        include_appinfo: 1,
        include_played_free_games: 1
      }
    });

    const games = response.data?.response?.games || [];
    let gamesAdded = 0;
    let achievementsAdded = 0;

    const syncPromises = games.slice(0, MAX_GAMES_PER_SYNC).map((steamGame: any) => 
      limit(async () => {
        try {
          // Upsert game
          const game = await prisma.game.upsert({
            where: { steamAppId: steamGame.appid },
            update: {
              title: steamGame.name,
              platform: 'Steam',
            },
            create: {
              title: steamGame.name,
              steamAppId: steamGame.appid,
              platform: 'Steam',
              source: 'steam'
            }
          });

          // Calculate missing playtime for prediction
          const currentLocal = await prisma.userGame.findUnique({
            where: { userId_gameId: { userId, gameId: game.id } },
            select: { totalPlaytime: true }
          });

          const steamTotalSeconds = steamGame.playtime_forever * 60;
          const localTotalSeconds = currentLocal?.totalPlaytime || 0;
          const missedSeconds = steamTotalSeconds - localTotalSeconds;

          if (missedSeconds > 300) { // More than 5 minutes difference
            const { PredictionEngine } = await import('./predictionEngine.js');
            await PredictionEngine.predictAndDistribute(userId, game.id, missedSeconds);
          }

          // Upsert UserGame
          await prisma.userGame.upsert({
            where: { userId_gameId: { userId, gameId: game.id } },
            update: {
              totalPlaytime: steamTotalSeconds,
              lastPlayed: steamGame.playtime_last_played ? new Date(steamGame.playtime_last_played * 1000) : undefined
            },
            create: {
              userId,
              gameId: game.id,
              totalPlaytime: steamTotalSeconds,
              lastPlayed: steamGame.playtime_last_played ? new Date(steamGame.playtime_last_played * 1000) : undefined,
              status: steamGame.playtime_forever > 0 ? 'playing' : 'backlog'
            }
          });
          gamesAdded++;

          // Fetch achievements
          const achRes = await axios.get('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/', {
            params: {
              key: apiKey,
              steamid: steamId,
              appid: steamGame.appid
            }
          });

          const achievements = achRes.data?.playerstats?.achievements || [];
          for (const ach of achievements) {
            if (ach.achieved === 1) {
              await prisma.gameAchievement.upsert({
                where: {
                  userId_gameId_key: {
                    userId,
                    gameId: game.id,
                    key: ach.apiname
                  }
                },
                update: {
                  isEarned: true,
                  earnedAt: ach.unlocktime > 0 ? new Date(ach.unlocktime * 1000) : undefined,
                },
                create: {
                  userId,
                  gameId: game.id,
                  key: ach.apiname,
                  name: ach.name || ach.apiname,
                  description: ach.description,
                  isEarned: true,
                  earnedAt: ach.unlocktime > 0 ? new Date(ach.unlocktime * 1000) : undefined,
                  source: 'steam'
                }
              });
              achievementsAdded++;
            }
          }

          // Throttle
          await new Promise(resolve => setTimeout(resolve, 1000 / STEAM_REQUESTS_PER_SECOND));

        } catch (err) {
          // Skip individual game errors
        }
      })
    );

    await Promise.allSettled(syncPromises);

    return { gamesAdded, achievementsAdded };
  } catch (error: any) {
    throw new Error(`Steam sync failed: ${error.message}`);
  }
}
