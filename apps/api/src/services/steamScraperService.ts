import prisma from '../lib/prisma.js';

export class SteamScraperService {
  /**
   * Scrapes public achievements for a user and game without an API key.
   * Uses the XML API for better reliability and adds strict validation for "unbreakability".
   */
  async syncAchievements(userId: string, gameId: string, steamId: string, steamAppId: string) {
    try {
      // ── 1. Robust Steam ID Resolution ─────────────────────────────────────
      let resolvedId = steamId.trim().replace(/\/$/, ''); // Remove trailing slash
      
      // Extract from URL if necessary
      if (resolvedId.includes('steamcommunity.com')) {
        const parts = resolvedId.split('/');
        if (resolvedId.includes('/id/')) {
          resolvedId = parts[parts.indexOf('id') + 1];
        } else if (resolvedId.includes('/profiles/')) {
          resolvedId = parts[parts.indexOf('profiles') + 1];
        }
      }

      const isNumeric = /^\d+$/.test(resolvedId);
      const baseUrl = isNumeric 
        ? `https://steamcommunity.com/profiles/${resolvedId}`
        : `https://steamcommunity.com/id/${resolvedId}`;
        
      const url = `${baseUrl}/stats/${steamAppId}/achievements/?xml=1`;
      console.log(`[SteamScraper] Fetching XML: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': 'birthtime=283996801; lastagecheckage=1-0-1979;',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) {
        throw new Error(`Steam returned ${response.status}. Verify profile is Public.`);
      }

      const text = await response.text();
      
      if (text.includes('You do not have permission') || text.includes('error_box')) {
        throw new Error('Steam "Game Details" are private. Please set them to Public in Privacy Settings.');
      }

      // ── 2. Improved XML Parsing ───────────────────────────────────────────
      const hoursPlayedMatch = text.match(/<hoursPlayed>(.*?)<\/hoursPlayed>/i);
      const totalPlaytimeSeconds = hoursPlayedMatch ? Math.round(parseFloat(hoursPlayedMatch[1].replace(',', '')) * 3600) : 0;

      // Update total playtime in library if we found any
      if (totalPlaytimeSeconds > 0) {
        try {
          await (prisma as any).userGame.update({
            where: { userId_gameId: { userId, gameId } },
            data: { totalPlaytime: totalPlaytimeSeconds }
          });
          console.log(`[Scraper] Updated playtime for game ${gameId}: ${totalPlaytimeSeconds}s`);
        } catch (e) {
          // Game might not be in library yet, that's okay
        }
      }

      // Split by <achievement tag to handle attributes correctly
      const achievementBlocks = text.split(/<achievement\s+/);
      achievementBlocks.shift(); // Remove header

      const scrapedAchievements = [];

      for (const block of achievementBlocks) {
        const name = block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] || block.match(/<name>(.*?)<\/name>/)?.[1];
        const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || block.match(/<description>(.*?)<\/description>/)?.[1];
        const icon = block.match(/<iconClosed><!\[CDATA\[(.*?)\]\]><\/iconClosed>/)?.[1] || block.match(/<iconClosed>(.*?)<\/iconClosed>/)?.[1];
        
        // Steam uses closed="1" attribute on the achievement tag itself
        const isEarned = block.trim().startsWith('closed="1"');
        const unlockTime = block.match(/<unlockTime>(.*?)<\/unlockTime>/)?.[1];

        if (name) {
          // ── 3. Strict Date Validation (The fix for Prisma ValidationError) ──
          let earnedAt: Date | null = null;
          if (isEarned) {
            if (unlockTime) {
              const ts = parseInt(unlockTime);
              if (!isNaN(ts) && ts > 0) {
                earnedAt = new Date(ts * 1000);
              }
            }
            // Fallback: if isEarned but no valid timestamp, use now
            if (!earnedAt || isNaN(earnedAt.getTime())) {
              earnedAt = new Date();
            }
          }

          scrapedAchievements.push({
            name: name.trim(),
            description: desc?.trim() || '',
            iconUrl: icon || '',
            isEarned,
            earnedAt
          });
        }
      }

      if (scrapedAchievements.length === 0) {
        console.warn(`[SteamScraper] No achievement blocks found in XML for ${steamAppId}. Text length: ${text.length}`);
        return { success: false, message: 'No achievements found. Check privacy settings.' };
      }

      // ── 4. Fail-Safe Database Write ───────────────────────────────────────
      let successCount = 0;
      for (const ach of scrapedAchievements) {
        try {
          await (prisma as any).gameAchievement.upsert({
            where: {
              userId_gameId_key: {
                userId,
                gameId,
                key: ach.name
              }
            },
            update: {
              isEarned: ach.isEarned,
              earnedAt: ach.earnedAt,
              description: ach.description,
              iconUrl: ach.iconUrl,
              source: 'steam'
            },
            create: {
              userId,
              gameId,
              key: ach.name,
              name: ach.name,
              description: ach.description,
              iconUrl: ach.iconUrl,
              isEarned: ach.isEarned,
              earnedAt: ach.earnedAt,
              source: 'steam'
            }
          });
          successCount++;
        } catch (dbErr: any) {
          console.error(`[SteamScraper] Failed to upsert "${ach.name}":`, dbErr.message);
          // Continue with others
        }
      }

      return { 
        success: true, 
        count: successCount, 
        message: `Successfully synced ${successCount} achievements.` 
      };
    } catch (err: any) {
      console.error('[SteamScraper] Critical Error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export const steamScraper = new SteamScraperService();
