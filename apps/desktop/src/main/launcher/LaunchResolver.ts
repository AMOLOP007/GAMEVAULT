import { LaunchConfig, LaunchMethod } from './GameLauncher.js'

// Game shape from Prisma — use only what's needed
interface ResolvableGame {
  id: string
  title: string
  steamAppId?: number | null
  epicAppId?: string | null
  gogAppId?: number | string | null
  launchUri?: string | null
  exePath?: string | null
  source?: string | null
}

export async function resolveLaunchConfig(game: ResolvableGame): Promise<LaunchConfig> {
  const { steamService } = await import('../services/steamService.js');
  const isSteamInstalled = steamService.getPath() !== null;

  // 1. PLATFORM PRIORITY FOR OFFICIAL GAMES
  // If the game was imported from Steam/Epic/GOG and we have the ID, use the official launcher!
  if (game.steamAppId && isSteamInstalled && game.source === 'steam') {
    return {
      gameId: game.id,
      title: game.title,
      method: 'steam',
      steamAppId: game.steamAppId,
    }
  }
  
  if (game.epicAppId && game.source === 'epic') {
    return {
      gameId: game.id,
      title: game.title,
      method: 'epic',
      epicAppId: game.epicAppId,
      launchUri: game.launchUri ?? undefined,
    }
  }

  if (game.gogAppId && game.source === 'gog') {
    return {
      gameId: game.id,
      title: game.title,
      method: 'gog',
      gogAppId: game.gogAppId as any,
    }
  }

  // 2. MASTER PRIORITY FOR MANUAL/CRACKED: Manual EXE provided by user or found by scanner
  if (game.exePath) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'exe',
      exePath: game.exePath,
    }
  }

  // 3. FALLBACK TO PLATFORM IF NO EXE (even if source doesn't match)
  if (game.steamAppId && isSteamInstalled) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'steam',
      steamAppId: game.steamAppId,
    }
  }
  
  if (game.epicAppId) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'epic',
      epicAppId: game.epicAppId,
      launchUri: game.launchUri ?? undefined,
    }
  }
  
  if (game.gogAppId) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'gog',
      gogAppId: game.gogAppId as any,
    }
  }
  
  if (game.launchUri) {
    let method: LaunchMethod = 'uri'
    if (game.launchUri.includes('stove')) method = 'stove'

    return {
      gameId: game.id,
      title: game.title,
      method,
      launchUri: game.launchUri,
    }
  }
  
  throw new Error('NO_LAUNCH_METHOD')
}

export function getLaunchMethodLabel(method: LaunchMethod): string {
  const labels: Record<LaunchMethod, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    gog: 'GOG Galaxy',
    exe: 'Direct Launch',
    uri: 'Custom URI',
    stove: 'Stove',
  }
  return labels[method] ?? 'Unknown'
}
