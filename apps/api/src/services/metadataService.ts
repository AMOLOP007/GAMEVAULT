import axios from 'axios';
import prisma from '../lib/prisma.js';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const RETRO_ACHIEVEMENTS_API_KEY = process.env.RETRO_ACHIEVEMENTS_API_KEY;

console.log(`[Metadata] API Keys Status - RAWG: ${!!RAWG_API_KEY}, Steam: ${!!STEAM_API_KEY}, IGDB: ${!!IGDB_CLIENT_ID}`);

interface AchievementData {
  key: string;
  title: string;
  description: string;
  iconUrl?: string;
}

let igdbToken: string | null = null;
let igdbTokenExpiry = 0;
let igdbErrorLogged = false;

async function getIGDBToken() {
  if (igdbToken && Date.now() < igdbTokenExpiry) return igdbToken;
  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) return null;

  try {
    const res = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`);
    igdbToken = res.data.access_token;
    igdbTokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
    igdbErrorLogged = false;
    return igdbToken;
  } catch (err: any) {
    if (!igdbErrorLogged) {
      console.warn(`[IGDB] Failed to get OAuth token (Client ID might be invalid). IGDB lookup disabled.`);
      igdbErrorLogged = true;
    }
    return null;
  }
}

export async function hydrateGameMetadata(gameId: string, searchHint?: string, force = false) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return;

  const hasOfficialCover = game.coverUrl && !game.coverUrl.startsWith('data:');
  
  // If it's a Steam game, prioritize Steam API for metadata
  if (game.steamAppId) {
    console.log(`[Metadata] Fetching metadata from Steam for AppID: ${game.steamAppId}`);
    try {
      const steamRes = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${game.steamAppId}`);
      const data = steamRes.data[game.steamAppId.toString()];
      if (data && data.success) {
        const steamGame = data.data;
        const verticalCover = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/library_600x900.jpg`;
        
        await (prisma as any).game.update({
          where: { id: gameId },
          data: {
            title: steamGame.name || game.title,
            coverUrl: verticalCover,
            genre: steamGame.genres?.map((g: any) => g.description).join(', ') || game.genre || 'Unknown',
            description: steamGame.short_description || game.description || '',
          }
        });
        console.log(`[Metadata] Successfully hydrated from Steam: ${game.title} → ${steamGame.name}`);
        
        // Also fetch achievements (waterfall)
        await syncAchievements(gameId);
        return; // Skip RAWG lookup!
      }
    } catch (err: any) {
      console.error(`[Metadata] Failed to fetch from Steam for ${game.title}: ${err.message}`);
      // Fallback to RAWG if Steam fails
    }
  }

  // If it's an Epic game, prioritize Epic API for metadata
  if (game.epicAppId) {
    console.log(`[Metadata] Fetching metadata from Epic for SandboxId: ${game.epicAppId}`);
    try {
      const epicData = await fetchMetadataFromEpic(game.title);
      if (epicData) {
        await (prisma as any).game.update({
          where: { id: gameId },
          data: {
            title: epicData.title || game.title,
            coverUrl: epicData.coverUrl || game.coverUrl,
            genre: epicData.genre || game.genre || 'Unknown',
          }
        });
        console.log(`[Metadata] Successfully hydrated from Epic: ${game.title} → ${epicData.title}`);
        await syncAchievements(gameId);
        return; // Skip RAWG lookup!
      }
    } catch (err: any) {
      console.error(`[Metadata] Failed to fetch from Epic for ${game.title}: ${err.message}`);
    }
  }

  // If it's a GOG game, prioritize GOG API for metadata
  if (game.gogAppId) {
    console.log(`[Metadata] Fetching metadata from GOG for AppId: ${game.gogAppId}`);
    try {
      const gogData = await fetchMetadataFromGOG(game.title);
      if (gogData) {
        await (prisma as any).game.update({
          where: { id: gameId },
          data: {
            title: gogData.title || game.title,
            coverUrl: gogData.coverUrl || game.coverUrl,
            genre: gogData.genre || game.genre || 'Unknown',
          }
        });
        console.log(`[Metadata] Successfully hydrated from GOG: ${game.title} → ${gogData.title}`);
        await syncAchievements(gameId);
        return; // Skip RAWG lookup!
      }
    } catch (err: any) {
      console.error(`[Metadata] Failed to fetch from GOG for ${game.title}: ${err.message}`);
    }
  }

  // Determine if title looks like an internal code (e.g., 'b1', 'gta5_exe', etc.)
  const titleIsGarbage = game.title.length <= 4 || /^[a-zA-Z]\d*$/.test(game.title);

  // Hydrate basic metadata if missing official cover or high-fidelity title or if forced
  if ((force || !hasOfficialCover || game.title.length < 5 || titleIsGarbage) && RAWG_API_KEY) {
    console.log(`[Metadata] Fetching high-fidelity metadata for: ${game.title} (hint: ${searchHint || 'none'})`);
    try {
      let results = [];
      let foundViaHint = false;
      
      // Try 0: Use searchHint first if forced and available (e.g. manual fix with folder hint)
      if (force && searchHint && searchHint.length > 2) {
        console.log(`[Metadata] Forcing search with hint: ${searchHint}`);
        const hintResponse = await axios.get(`https://api.rawg.io/api/games`, {
          params: { key: RAWG_API_KEY, search: searchHint, page_size: 3 }
        });
        results = hintResponse.data.results || [];
        if (results.length > 0) foundViaHint = true;
      }
      
      // Try 1: Original Title (skip if it's a garbage internal code or if we already found results)
      if (results.length === 0 && !titleIsGarbage) {
        const response = await axios.get(`https://api.rawg.io/api/games`, {
          params: { key: RAWG_API_KEY, search: game.title, page_size: 3 }
        });
        results = response.data.results || [];
      }

      // Try 2: Cleaned Title (strip "Enhanced Edition", "Director's Cut", etc.)
      if (results.length === 0 && !titleIsGarbage) {
        const cleanedTitle = game.title
          .replace(/Enhanced Edition/gi, '')
          .replace(/Director'?s Cut/gi, '')
          .replace(/Remastered/gi, '')
          .replace(/GOTY/gi, '')
          .replace(/Game of the Year/gi, '')
          .trim();
        
        if (cleanedTitle !== game.title && cleanedTitle.length > 2) {
          console.log(`[Metadata] Retrying with cleaned title: ${cleanedTitle}`);
          const retryResponse = await axios.get(`https://api.rawg.io/api/games`, {
            params: { key: RAWG_API_KEY, search: cleanedTitle, page_size: 3 }
          });
          results = retryResponse.data.results || [];
        }
      }

      // Try 3: Use installPath folder name / searchHint (for cryptic exe names like 'b1')
      if (results.length === 0 && searchHint && searchHint.length > 2) {
        console.log(`[Metadata] Retrying with search hint (folder name): ${searchHint}`);
        const hintResponse = await axios.get(`https://api.rawg.io/api/games`, {
          params: { key: RAWG_API_KEY, search: searchHint, page_size: 3 }
        });
        results = hintResponse.data.results || [];
        if (results.length > 0) foundViaHint = true;
      }

      // Try 4: Fuzzy - take only first 3 words of the search hint
      if (results.length === 0 && searchHint && searchHint.split(' ').length > 3) {
        const shortHint = searchHint.split(' ').slice(0, 3).join(' ');
        console.log(`[Metadata] Retrying with short hint: ${shortHint}`);
        const shortResponse = await axios.get(`https://api.rawg.io/api/games`, {
          params: { key: RAWG_API_KEY, search: shortHint, page_size: 3 }
        });
        results = shortResponse.data.results || [];
        if (results.length > 0) foundViaHint = true;
      }

      if (results.length > 0) {
        const result = results[0];
        await (prisma as any).game.update({
          where: { id: gameId },
          data: {
            // Only update title if it's garbage or we found via hint
            title: (titleIsGarbage || foundViaHint) ? result.name : (result.name || game.title),
            coverUrl: result.background_image,
            genre: result.genres?.map((g: any) => g.name).join(', ') || 'Unknown',
            description: result.description_raw || game.description || '',
            rating: result.rating || 0,
            rawgId: result.id.toString()
          }
        });
        console.log(`[Metadata] Successfully hydrated: ${game.title} → ${result.name}`);
      } else {
        console.warn(`[Metadata] No results found for: ${game.title} (hint: ${searchHint || 'none'})`);
      }
    } catch (err: any) {
      console.error(`[Metadata] Failed to hydrate ${game.title}: ${err.message}`);
    }
  }

  // Fetch achievements via waterfall
  await syncAchievements(gameId);
}

export async function syncAchievements(gameId: string) {
  const achievements = await getAchievements(gameId);
  if (!achievements || achievements.length === 0) return;

  console.log(`[Metadata] Syncing ${achievements.length} achievements for game ${gameId}`);
  for (const ach of achievements) {
    await (prisma as any).achievement.upsert({
      where: { gameId_key: { gameId, key: ach.key } },
      update: {
        title: ach.title,
        description: ach.description,
        iconUrl: ach.iconUrl
      },
      create: {
        gameId,
        key: ach.key,
        title: ach.title,
        description: ach.description,
        iconUrl: ach.iconUrl,
        condition: JSON.stringify({ type: 'manual' })
      }
    });
  }
}

async function getAchievements(gameId: string): Promise<AchievementData[] | null> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return null;

  // 1. Steam Web API
  if (game.steamAppId) {
    const steamData = await fetchFromSteam(game.steamAppId);
    if (steamData && steamData.length > 0) return steamData;
  }

  // 1.5. Epic Games Store (GraphQL)
  if (game.epicAppId) {
    const epicData = await fetchFromEpic(game.epicAppId);
    if (epicData && epicData.length > 0) return epicData;
  }

  // 2. RAWG API
  if (game.rawgId || game.title) {
    const rawgData = await fetchFromRAWG(game.rawgId, game.title);
    if (rawgData && rawgData.length > 0) return rawgData;
  }

  // 3. IGDB API
  if (game.igdbId || game.title) {
    const igdbData = await fetchFromIGDB(game.igdbId, game.title);
    if (igdbData && igdbData.length > 0) return igdbData;
  }

  // 4. OpenAchievements
  const openData = await fetchFromOpenAchievements(game.title);
  if (openData && openData.length > 0) return openData;

  // 5. RetroAchievements
  // Assuming platform or some tag indicates retro
  const retroData = await fetchFromRetroAchievements(game.title);
  if (retroData && retroData.length > 0) return retroData;

  // 6. Community Fallback
  const communityData = await fetchFromCommunity(gameId);
  if (communityData && communityData.length > 0) return communityData;

  return null;
}

async function fetchFromSteam(appId: number): Promise<AchievementData[] | null> {
  if (!STEAM_API_KEY) {
    console.warn('[Steam] Missing STEAM_API_KEY');
    return null;
  }
  try {
    const res = await axios.get(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/`, {
      params: { key: STEAM_API_KEY, appid: appId }
    });
    const achievements = res.data.game?.availableGameStats?.achievements;
    if (!achievements) return null;

    return achievements.map((a: any) => ({
      key: `steam_${a.name}`,
      title: a.displayName,
      description: a.description || '',
      iconUrl: a.icon
    }));
  } catch { return null; }
}

async function fetchFromRAWG(rawgId?: string | null, title?: string): Promise<AchievementData[] | null> {
  if (!RAWG_API_KEY) return null;
  try {
    let id = rawgId;
    if (!id && title) {
      const search = await axios.get(`https://api.rawg.io/api/games`, {
        params: { key: RAWG_API_KEY, search: title, page_size: 1 }
      });
      id = search.data.results?.[0]?.id?.toString();
    }
    if (!id) return null;

    const res = await axios.get(`https://api.rawg.io/api/games/${id}/achievements`, {
      params: { key: RAWG_API_KEY }
    });
    return res.data.results?.map((a: any) => ({
      key: `rawg_${a.id}`,
      title: a.name,
      description: a.description || '',
      iconUrl: a.image
    })) || null;
  } catch { return null; }
}

async function fetchFromEpic(sandboxId: string): Promise<AchievementData[] | null> {
  try {
    const query = `
      query getAchievementDefinitions($sandboxId: String!, $locale: String) {
        Achievement {
          getAchievementDefinitions(sandboxId: $sandboxId, locale: $locale) {
            achievements {
              achievementId
              name
              description
              unlockedIconId
              lockedIconId
            }
          }
        }
      }
    `;

    const res = await axios.post('https://graphql.epicgames.com/graphql', {
      query,
      variables: { sandboxId, locale: 'en-US' }
    });

    const achievements = res.data?.data?.Achievement?.getAchievementDefinitions?.achievements;
    if (!achievements) return null;

    return achievements.map((a: any) => ({
      key: `epic_${a.achievementId}`,
      title: a.name,
      description: a.description || '',
      iconUrl: a.unlockedIconId
    }));
  } catch (err) {
    console.error(`[EpicMetadata] Failed to fetch for ${sandboxId}:`, err);
    return null;
  }
}

export async function searchEpicSandboxId(title: string): Promise<string | null> {
  try {
    const query = `
      query searchStore($keywords: String!) {
        Catalog {
          searchStore(keywords: $keywords, count: 5) {
            elements {
              title
              namespace
              categories { path }
            }
          }
        }
      }
    `;

    const res = await axios.post('https://graphql.epicgames.com/graphql', {
      query,
      variables: { keywords: title }
    });

    const elements = res.data?.data?.Catalog?.searchStore?.elements;
    if (!elements || elements.length === 0) return null;

    // Filter for games or editions
    const bestMatch = elements.find((e: any) => 
      e.categories?.some((c: any) => c.path.includes('games')) || 
      e.title.toLowerCase() === title.toLowerCase()
    ) || elements[0];

    return bestMatch.namespace;
  } catch (err) {
    console.error(`[EpicSearch] Failed for ${title}:`, err);
    return null;
  }
}

export async function fetchMetadataFromEpic(title: string): Promise<{ title: string, coverUrl?: string, genre?: string } | null> {
  try {
    const query = `
      query searchStore($keywords: String!) {
        Catalog {
          searchStore(keywords: $keywords, count: 5) {
            elements {
              title
              namespace
              categories { path }
              keyImages {
                type
                url
              }
            }
          }
        }
      }
    `;

    const res = await axios.post('https://graphql.epicgames.com/graphql', {
      query,
      variables: { keywords: title }
    });

    const elements = res.data?.data?.Catalog?.searchStore?.elements;
    if (!elements || elements.length === 0) return null;

    const bestMatch = elements.find((e: any) => 
      e.categories?.some((c: any) => c.path.includes('games')) || 
      e.title.toLowerCase() === title.toLowerCase()
    ) || elements[0];

    const coverObj = bestMatch.keyImages?.find((img: any) => img.type === 'OfferImageTall' || img.type === 'Vault') || bestMatch.keyImages?.[0];
    const genreList = bestMatch.categories?.map((c: any) => c.path.split('/').pop()).filter(Boolean).join(', ') || 'Unknown';

    return {
      title: bestMatch.title,
      coverUrl: coverObj?.url,
      genre: genreList
    };
  } catch (err) {
    console.error(`[EpicMetadata] Failed for ${title}:`, err);
    return null;
  }
}

export async function fetchMetadataFromGOG(title: string): Promise<{ title: string, coverUrl?: string, genre?: string } | null> {
  try {
    const res = await axios.get(`https://embed.gog.com/games/ajax/filtered`, {
      params: { search: title }
    });
    const games = res.data.products;
    if (!games || games.length === 0) return null;

    const bestMatch = games[0];
    
    let coverUrl = bestMatch.image;
    if (coverUrl && coverUrl.startsWith('//')) {
      coverUrl = `https:${coverUrl}`;
    }

    const genreList = bestMatch.genres?.join(', ') || 'Unknown';

    return {
      title: bestMatch.title,
      coverUrl: coverUrl,
      genre: genreList
    };
  } catch (err) {
    console.error(`[GOGMetadata] Failed for ${title}:`, err);
    return null;
  }
}

async function fetchFromIGDB(igdbId?: string | null, title?: string): Promise<AchievementData[] | null> {
  const token = await getIGDBToken();
  if (!token) return null;

  try {
    let id = igdbId;
    if (!id && title) {
      const search = await axios.post('https://api.igdb.com/v4/games', 
        `search "${title}"; fields id; limit 1;`, 
        { headers: { 'Client-ID': IGDB_CLIENT_ID!, 'Authorization': `Bearer ${token}` } }
      );
      id = search.data[0]?.id?.toString();
    }
    if (!id) return null;

    const res = await axios.post('https://api.igdb.com/v4/achievements', 
      `where game = ${id}; fields name, description, icon_url; limit 500;`, 
      { headers: { 'Client-ID': IGDB_CLIENT_ID!, 'Authorization': `Bearer ${token}` } }
    );
    return res.data.map((a: any) => ({
      key: `igdb_${a.id}`,
      title: a.name,
      description: a.description || '',
      iconUrl: a.icon_url
    }));
  } catch { return null; }
}

async function fetchFromOpenAchievements(title: string): Promise<AchievementData[] | null> {
  try {
    const res = await axios.get(`https://openachievements.org/api/v1/games/search`, {
      params: { q: title }
    });
    const game = res.data[0];
    if (!game) return null;

    const achs = await axios.get(`https://openachievements.org/api/v1/games/${game.id}/achievements`);
    return achs.data.map((a: any) => ({
      key: `open_${a.id}`,
      title: a.name,
      description: a.description || '',
      iconUrl: a.icon_url
    }));
  } catch { return null; }
}

async function fetchFromRetroAchievements(title: string): Promise<AchievementData[] | null> {
  if (!RETRO_ACHIEVEMENTS_API_KEY) return null;
  try {
    const search = await axios.get(`https://retroachievements.org/API/API_GetGameList.php`, {
      params: { key: RETRO_ACHIEVEMENTS_API_KEY, s: title }
    });
    const game = search.data[0];
    if (!game) return null;

    const res = await axios.get(`https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php`, {
      params: { key: RETRO_ACHIEVEMENTS_API_KEY, g: game.ID, u: 'dummy' }
    });
    return Object.values(res.data.Achievements).map((a: any) => ({
      key: `retro_${a.ID}`,
      title: a.Title,
      description: a.Description || '',
      iconUrl: `https://media.retroachievements.org/Badge/${a.BadgeName}.png`
    }));
  } catch { return null; }
}

async function fetchFromCommunity(gameId: string): Promise<AchievementData[] | null> {
  const communityAchs = await (prisma as any).communityAchievement.findMany({
    where: { gameId }
  });
  if (communityAchs.length === 0) return null;

  return communityAchs.map((a: any) => ({
    key: `community_${a.key}`,
    title: a.title,
    description: a.description,
    iconUrl: a.iconUrl
  }));
}

export async function hydrateAllMissingMetadata() {
  // Hydrate games that: (a) have no cover, OR (b) have a garbage title (internal code like 'b1')
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { coverUrl: null },
        { title: { equals: '' } },
        // Short titles <= 4 chars are almost certainly internal exe names
        // We can't do length check in Prisma, so we'll filter client-side
      ]
    }
  });

  // Also get all games and filter for garbage titles client-side
  const allGames = await prisma.game.findMany();
  const garbageGames = allGames.filter(g => 
    (g.title.length <= 4 || /^[a-zA-Z]\d*$/.test(g.title)) && 
    !games.find(x => x.id === g.id)
  );

  const toHydrate = [...games, ...garbageGames];

  if (toHydrate.length === 0) return;

  console.log(`[Metadata] Bulk hydrating ${toHydrate.length} games (${garbageGames.length} with garbage titles)...`);

  // PERF: Limit to 3 concurrent hydrations to avoid spiking CPU/network on startup.
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(3);

  const tasks = toHydrate.map(game =>
    limit(async () => {
      // Derive hint from exePath folder
      const path = await import('path');
      const hint = game.exePath ? path.basename(path.dirname(game.exePath)) : undefined;
      
      // If title is garbage, clear cover to force full re-hydration
      if (game.title.length <= 4 || /^[a-zA-Z]\d*$/.test(game.title)) {
        await prisma.game.update({ where: { id: game.id }, data: { coverUrl: null, rawgId: null } }).catch(() => {});
      }
      
      await hydrateGameMetadata(game.id, hint).catch(err =>
        console.warn(`[Metadata] Hydration failed for ${game.title}: ${err.message}`)
      );
      // Small delay between items to stay under RAWG's rate limit
      await new Promise(resolve => setTimeout(resolve, 300));
    })
  );

  await Promise.allSettled(tasks);
  console.log(`[Metadata] Bulk hydration complete for ${toHydrate.length} games`);
}
