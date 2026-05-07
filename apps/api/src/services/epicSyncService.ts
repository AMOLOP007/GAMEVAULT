import axios from 'axios';
import prisma from '../lib/prisma.js';
import { ExophaseService } from './exophaseService.js';
import { searchEpicSandboxId } from './metadataService.js';

// Max 2 concurrent GraphQL calls to Epic — respect rate limits
const EPIC_GRAPHQL_URL = 'https://graphql.epicgames.com/graphql';

export class EpicSyncService {
  /**
   * Fetches user's Epic library, playtime and achievements.
   * Uses GraphQL for high-fidelity data retrieval.
   *
   * PERF: Only processes games that have an epicAppId.
   * Previous bug: iterated ALL user games (Steam, GOG, etc.) — wasted cycles.
   */
  static async syncEpicData(userId: string, epicAccountId: string, accessToken?: string) {
    try {
      console.log(`[EpicSync] Starting robust sync for user ${userId} (EpicID: ${epicAccountId})`);

      let achievementsSynced = 0;
      let definitionsHydrated = 0;
      let playtimeSynced = 0;
      let gamesDiscovered = 0;

      // 1. Discover Library if we have a token
      if (accessToken) {
        try {
          const libQuery = `
            query getLibrary($accountId: String!) {
              Library {
                getLibrary(accountId: $accountId) {
                  records {
                    appName
                    catalogItemId
                    namespace
                  }
                }
              }
            }
          `;

          const libRes = await axios.post(EPIC_GRAPHQL_URL, {
            query: libQuery,
            variables: { accountId: epicAccountId }
          }, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          const records = libRes.data?.data?.Library?.getLibrary?.records || [];
          for (const rec of records) {
            // ── IMPORTANT: rec.namespace is the CatalogNamespace (sandbox ID) ──
            // This is what getAchievementDefinitions uses, NOT catalogItemId.
            // rec.appName is the launcher key used in com.epicgames.launcher://apps/{appName}
            const sandboxId = rec.namespace;
            const appName = rec.appName;

            if (!sandboxId) continue;

            // Find or create game in global DB — key by sandboxId (namespace)
            const game = await prisma.game.upsert({
              where: { epicAppId: sandboxId },
              update: { title: rec.appName || undefined },
              create: {
                title: rec.appName || sandboxId,
                epicAppId: sandboxId,
                // Store AppName in launchUri so the desktop launcher uses it correctly
                launchUri: `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`,
                platform: 'Epic',
                source: 'epic',
              }
            });

            // Ensure it's in user's library
            const ug = await prisma.userGame.upsert({
              where: { userId_gameId: { userId, gameId: game.id } },
              update: {},
              create: {
                userId,
                gameId: game.id,
                status: 'playing'
              }
            });

            if (ug) gamesDiscovered++;
          }
        } catch (e) {
          console.error('[EpicSync] Library discovery failed:', e);
        }
      }

      // 2. Universal Fallback (Exophase) — only when no OAuth token available
      if (epicAccountId && !accessToken) {
        try {
          const exophaseResult = await ExophaseService.syncPlatform(userId, 'epic', epicAccountId);
          achievementsSynced += exophaseResult.gamesSynced;
        } catch (e) {
          console.error('[EpicSync] Exophase fallback failed:', e);
        }
      }

      // 3. Official GraphQL Sync — ONLY for Epic games (epicAppId is not null)
      // PERF FIX: Previous code iterated ALL userGames — now filtered to Epic only
      const epicUserGames = await prisma.userGame.findMany({
        where: {
          userId,
          game: { epicAppId: { not: null } }  // ← Only Epic games
        },
        include: { game: true }
      });

      console.log(`[EpicSync] Processing ${epicUserGames.length} Epic games for achievement sync`);

      for (const ug of epicUserGames) {
        let sandboxId = ug.game.epicAppId;

        // If somehow missing the sandbox ID, try to find it via Catalog Search
        if (!sandboxId) {
          sandboxId = await searchEpicSandboxId(ug.game.title);
          if (sandboxId) {
            await prisma.game.update({
              where: { id: ug.gameId },
              data: { epicAppId: sandboxId }
            });
          }
        }

        if (!sandboxId) continue;

        try {
          // Fetch ALL achievement definitions via GraphQL (no auth required)
          const defQuery = `
            query getAchievementDefinitions($sandboxId: String!) {
              Achievement {
                getAchievementDefinitions(sandboxId: $sandboxId) {
                  achievements {
                    achievementId
                    name
                    description
                    unlockedIconId
                  }
                }
              }
            }
          `;

          const defRes = await axios.post(EPIC_GRAPHQL_URL, {
            query: defQuery,
            variables: { sandboxId }
          });

          const definitions = defRes.data?.data?.Achievement?.getAchievementDefinitions?.achievements || [];
          if (definitions.length === 0) continue;

          definitionsHydrated += definitions.length;

          // Upsert definitions
          for (const ach of definitions) {
            await (prisma as any).achievement.upsert({
              where: { gameId_key: { gameId: ug.gameId, key: `epic_${ach.achievementId}` } },
              update: { title: ach.name, description: ach.description, iconUrl: ach.unlockedIconId },
              create: {
                gameId: ug.gameId,
                key: `epic_${ach.achievementId}`,
                title: ach.name,
                description: ach.description,
                iconUrl: ach.unlockedIconId,
                condition: JSON.stringify({ type: 'manual' })
              }
            });
          }

          // 4. Fetch Player Progress (requires auth token)
          if (accessToken) {
            const progQuery = `
              query getPlayerAchievements($sandboxId: String!, $accountId: String!) {
                Achievement {
                  getPlayerAchievements(sandboxId: $sandboxId, accountId: $accountId) {
                    playerAchievements {
                      achievementId
                      unlockedAt
                    }
                  }
                }
              }
            `;

            const progRes = await axios.post(EPIC_GRAPHQL_URL, {
              query: progQuery,
              variables: { sandboxId, accountId: epicAccountId }
            }, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const playerAchs = progRes.data?.data?.Achievement?.getPlayerAchievements?.playerAchievements || [];
            
            for (const ach of playerAchs) {
              if (ach.unlockedAt) {
                await prisma.gameAchievement.upsert({
                  where: {
                    userId_gameId_key: { userId, gameId: ug.gameId, key: `epic_${ach.achievementId}` }
                  },
                  update: {
                    isEarned: true,
                    earnedAt: new Date(ach.unlockedAt),
                  },
                  create: {
                    userId,
                    gameId: ug.gameId,
                    key: `epic_${ach.achievementId}`,
                    name: definitions.find((d: any) => d.achievementId === ach.achievementId)?.name || ach.achievementId,
                    isEarned: true,
                    earnedAt: new Date(ach.unlockedAt),
                    source: 'epic'
                  }
                });
                achievementsSynced++;
              }
            }
          }
        } catch (e) {
          console.warn(`[EpicSync] GraphQL failed for ${ug.game.title}:`, e instanceof Error ? e.message : e);
        }
      }

      return { achievementsSynced, definitionsHydrated, gamesDiscovered, playtimeSynced };
    } catch (err) {
      console.error(`[EpicSync] Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  }
}
