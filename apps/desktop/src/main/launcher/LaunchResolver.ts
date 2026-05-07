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
}

export async function resolveLaunchConfig(game: ResolvableGame): Promise<LaunchConfig> {
  // MASTER PRIORITY: Manual EXE provided by user
  if (game.exePath) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'exe',
      exePath: game.exePath,
    }
  }

  // PLATFORM PRIORITY: Steam > Epic > GOG > Stove > URI
  const { steamService } = await import('../services/steamService.js');
  const isSteamInstalled = steamService.getPath() !== null;

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
      // Pass the stored launchUri — it contains the correct AppName for the protocol
      // epicAppId is the CatalogNamespace (sandbox ID) used by the Achievement API, not for launch
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
