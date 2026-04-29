// Type declarations for window.gameVault IPC bridge

export {}

interface DetectedGame {
  id: string
  title: string
  exePath?: string
  processName?: string
  coverUrl?: string
  source: 'steam' | 'epic' | 'gog' | 'registry' | 'manual'
  steamAppId?: number
  epicAppId?: string
  gogAppId?: string
}

interface ActiveSession {
  gameId: string
  startTime: string
  processName: string
}

interface TrophyData {
  title: string
  description?: string
  type: 'bronze' | 'silver' | 'gold' | 'platinum'
  iconUrl?: string
}

interface GameEvent {
  gameId: string
  startTime?: string
  endTime?: string
  duration?: number
}

interface LaunchEvent {
  gameId: string
  error?: string
  exePath?: string
}

interface CustomChallengeInput {
  title: string
  description: string
  gameId?: string
}

declare global {
  interface Window {
    gameVault?: {
      // Auth
      getToken: () => Promise<string>
      setToken: (token: string) => Promise<void>

      // Library
      openFolderDialog: () => Promise<string | null>
      scanFolder: (dirPath: string) => Promise<DetectedGame[]>
      getDetectedGames: () => Promise<DetectedGame[]>

      // Launch
      launchGame: (gameId: string) => Promise<{ success: boolean; error?: string; method?: string }>
      setGameExe: (gameId: string) => Promise<{ success: boolean; exePath?: string }>

      // Session
      getCurrentSession: () => Promise<ActiveSession | null>

      // Achievements & Challenges
      getAchievements: (gameId: string) => Promise<unknown[]>
      addCustomChallenge: (challenge: CustomChallengeInput) => Promise<void>

      // Overlay
      triggerTrophy: (data: TrophyData) => Promise<void>

      // Events: game lifecycle
      onGameStart:          (cb: (data: GameEvent) => void) => void
      onGameEnd:            (cb: (data: GameEvent) => void) => void
      onGameLaunching:      (cb: (data: LaunchEvent) => void) => void
      onGameLaunchFailed:   (cb: (data: LaunchEvent) => void) => void
      onExeSet:             (cb: (data: LaunchEvent) => void) => void

      // Events: sync and system
      onSyncStatus: (cb: (data: { online: boolean; apiOnline: boolean; pendingWrites: number; rawgUsagePercent: number }) => void) => void
      onLibraryUpdated: (cb: () => void) => void

      // Events: achievements
      onAchievementUnlocked: (cb: (data: TrophyData) => void) => void
    }
  }
}
