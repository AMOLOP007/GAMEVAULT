import axios from 'axios';
import prisma from '../lib/prisma.js';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const RETRO_ACHIEVEMENTS_API_KEY = process.env.RETRO_ACHIEVEMENTS_API_KEY;

interface AchievementData {
  key: string;
  title: string;
  description: string;
  iconUrl?: string;
}

let igdbToken: string | null = null;
let igdbTokenExpiry = 0;

async function getIGDBToken() {
  if (igdbToken && Date.now() < igdbTokenExpiry) return igdbToken;
  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) return null;

  try {
    const res = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`);
    igdbToken = res.data.access_token;
    igdbTokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
    return igdbToken;
  } catch (err: any) {
    console.error(`[IGDB] Failed to get OAuth token: ${err.message}`);
    return null;
  }
}

export async function hydrateGameMetadata(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return;

  // Hydrate basic metadata if missing
  if (!game.coverUrl && RAWG_API_KEY) {
    console.log(`[Metadata] Fetching metadata for: ${game.title}`);
    try {
      let results = [];
      
      // Try 1: Original Title
      const response = await axios.get(`https://api.rawg.io/api/games`, {
        params: { key: RAWG_API_KEY, search: game.title, page_size: 1 }
      });
      results = response.data.results || [];

      // Try 2: Cleaned Title (strip "Enhanced Edition", "Director's Cut", etc.)
      if (results.length === 0) {
        const cleanedTitle = game.title
          .replace(/Enhanced Edition/gi, '')
          .replace(/Director'?s Cut/gi, '')
          .replace(/Remastered/gi, '')
          .replace(/GOTY/gi, '')
          .replace(/Game of the Year/gi, '')
          .trim();
        
        if (cleanedTitle !== game.title) {
          console.log(`[Metadata] Retrying with cleaned title: ${cleanedTitle}`);
          const retryResponse = await axios.get(`https://api.rawg.io/api/games`, {
            params: { key: RAWG_API_KEY, search: cleanedTitle, page_size: 1 }
          });
          results = retryResponse.data.results || [];
        }
      }

      if (results.length > 0) {
        const result = results[0];
        await (prisma as any).game.update({
          where: { id: gameId },
          data: {
            coverUrl: result.background_image,
            genre: result.genres?.[0]?.name || 'Unknown',
            description: result.description_raw || game.description || '',
            rating: result.rating || 0,
            rawgId: result.id.toString()
          }
        });
        console.log(`[Metadata] Successfully hydrated: ${game.title}`);
      } else {
        console.warn(`[Metadata] No results found for: ${game.title}`);
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
  const games = await prisma.game.findMany({
    where: { coverUrl: null }
  });

  console.log(`[Metadata] Bulk hydrating ${games.length} games in background...`);
  games.forEach(game => {
    hydrateGameMetadata(game.id).catch(console.error);
  });
}
