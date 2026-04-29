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
  // Priority: Steam > Epic > GOG > URI > EXE
  // Check if platform is actually installed before committing to its method
  
  const { steamService } = await import('../services/steamService.js');
  const isSteamInstalled = steamService.getPath() !== null;

  if (game.steamAppId && isSteamInstalled) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'steam',
      steamAppId: game.steamAppId,
      exePath: game.exePath ?? undefined,
    }
  }
  
  if (game.epicAppId) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'epic',
      epicAppId: game.epicAppId,
      exePath: game.exePath ?? undefined,
    }
  }
  
  if (game.gogAppId) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'gog',
      gogAppId: game.gogAppId as any,
      exePath: game.exePath ?? undefined,
    }
  }
  
  if (game.launchUri) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'uri',
      launchUri: game.launchUri,
    }
  }
  
  if (game.exePath) {
    return {
      gameId: game.id,
      title: game.title,
      method: 'exe',
      exePath: game.exePath,
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
  }
  return labels[method] ?? 'Unknown'
}
