import prisma from '../db.js';
import log from 'electron-log';
import { TrophyOverlay } from '../overlay/TrophyOverlay.js';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  conditionType: string;
  conditionValue: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Welcome Badge
  { id: 'welcome_vault', name: 'Welcome to the Vault', description: 'Create your account and start your journey', icon: '🌟', rarity: 'COMMON', conditionType: 'ACCOUNT_CREATION', conditionValue: 1 },

  // Playtime Badges
  { id: 'first_step', name: 'First Step', description: 'Launch your first game through GameVault', icon: '🚀', rarity: 'COMMON', conditionType: 'TOTAL_SESSIONS', conditionValue: 1 },
  { id: 'warm_up', name: 'Warm Up', description: 'Accumulate 1 hour of total playtime', icon: '🔥', rarity: 'COMMON', conditionType: 'TOTAL_PLAYTIME', conditionValue: 3600 },
  { id: 'getting_serious', name: 'Getting Serious', description: 'Accumulate 10 hours of total playtime', icon: '🎮', rarity: 'COMMON', conditionType: 'TOTAL_PLAYTIME', conditionValue: 36000 },
  { id: 'dedicated', name: 'Dedicated', description: 'Accumulate 50 hours of total playtime', icon: '🎖️', rarity: 'RARE', conditionType: 'TOTAL_PLAYTIME', conditionValue: 180000 },
  { id: 'veteran', name: 'Veteran', description: 'Accumulate 100 hours of total playtime', icon: '🎖️', rarity: 'RARE', conditionType: 'TOTAL_PLAYTIME', conditionValue: 360000 },
  { id: 'obsessed', name: 'Obsessed', description: 'Accumulate 500 hours of total playtime', icon: '👑', rarity: 'EPIC', conditionType: 'TOTAL_PLAYTIME', conditionValue: 1800000 },
  { id: 'legend', name: 'Legend', description: 'Accumulate 1000 hours of total playtime', icon: '💎', rarity: 'LEGENDARY', conditionType: 'TOTAL_PLAYTIME', conditionValue: 3600000 },
  { id: 'marathon_runner', name: 'Marathon Runner', description: 'Play a single game for 6 hours in one session', icon: '🏃', rarity: 'RARE', conditionType: 'SINGLE_SESSION_PLAYTIME', conditionValue: 21600 },
  { id: 'insomniac', name: 'Insomniac', description: 'Play past 2am', icon: '🌙', rarity: 'RARE', conditionType: 'PLAY_PAST_TIME', conditionValue: 2 }, // 2am
  { id: 'early_bird', name: 'Early Bird', description: 'Start a gaming session before 7am', icon: '🌅', rarity: 'RARE', conditionType: 'PLAY_BEFORE_TIME', conditionValue: 7 }, // 7am

  // Library Badges
  { id: 'collector', name: 'Collector', description: 'Add 10 games to your library', icon: '📚', rarity: 'COMMON', conditionType: 'LIBRARY_COUNT', conditionValue: 10 },
  { id: 'hoarder', name: 'Hoarder', description: 'Add 50 games to your library', icon: '📦', rarity: 'RARE', conditionType: 'LIBRARY_COUNT', conditionValue: 50 },
  { id: 'the_vault', name: 'The Vault', description: 'Add 100 games to your library', icon: '🏦', rarity: 'EPIC', conditionType: 'LIBRARY_COUNT', conditionValue: 100 },
  { id: 'genre_explorer', name: 'Genre Explorer', description: 'Play games from 5 different genres', icon: '🗺️', rarity: 'RARE', conditionType: 'GENRE_COUNT', conditionValue: 5 },
  { id: 'loyal', name: 'Loyal', description: 'Launch the same game 10 times', icon: '🐕', rarity: 'COMMON', conditionType: 'SINGLE_GAME_LAUNCHES', conditionValue: 10 },
  { id: 'one_true_game', name: 'One True Game', description: 'Accumulate 100 hours in a single game', icon: '💍', rarity: 'EPIC', conditionType: 'SINGLE_GAME_PLAYTIME', conditionValue: 360000 },

  // Achievement Badges
  { id: 'trophy_hunter', name: 'Trophy Hunter', description: 'Unlock 10 achievements across any games', icon: '🏹', rarity: 'COMMON', conditionType: 'TOTAL_ACHIEVEMENTS', conditionValue: 10 },
  { id: 'achievement_grinder', name: 'Achievement Grinder', description: 'Unlock 50 achievements across any games', icon: '⚙️', rarity: 'RARE', conditionType: 'TOTAL_ACHIEVEMENTS', conditionValue: 50 },
  { id: 'completionist', name: 'Completionist', description: 'Unlock all achievements in any single game', icon: '💯', rarity: 'EPIC', conditionType: 'COMPLETE_GAME_ACHIEVEMENTS', conditionValue: 100 },
  { id: 'grand_master', name: 'Grand Master', description: 'Complete every single trophy in a game to reach the pinnacle', icon: '💎', rarity: 'LEGENDARY', conditionType: 'COMPLETE_GAME_ACHIEVEMENTS', conditionValue: 100 },
  { id: 'genre_mastery', name: 'Genre Mastery', description: 'Complete all trophies in 3 different games', icon: '🏆', rarity: 'EPIC', conditionType: 'MULTIPLE_COMPLETE_GAMES', conditionValue: 3 },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Unlock 5 achievements in a single gaming session', icon: '⚡', rarity: 'RARE', conditionType: 'SESSION_ACHIEVEMENTS', conditionValue: 5 },
];

export class BadgeService {
  private overlay: TrophyOverlay;

  constructor(overlay: TrophyOverlay) {
    this.overlay = overlay;
  }

  async init() {
    log.info('[BadgeService] Initializing badges in database...');
    for (const badge of BADGE_DEFINITIONS) {
      await (prisma as any).badge.upsert({
        where: { id: badge.id },
        update: {
          code: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          conditionType: badge.conditionType,
          conditionValue: badge.conditionValue,
        },
        create: {
          id: badge.id,
          code: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          conditionType: badge.conditionType,
          conditionValue: badge.conditionValue,
        }
      });
    }
  }

  async checkBadges(userId: string, context: { 
    gameId?: string, 
    sessionId?: string, 
    sessionDuration?: number,
    achievementsUnlockedInSession?: number
  } = {}) {
    try {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: { 
          badges: true,
          sessions: { orderBy: { startTime: 'desc' } },
          games: { include: { game: true } },
          gameAchievements: true
        }
      });

      if (!user) return;

      const unlockedBadgeIds = new Set(user.badges.map((b: any) => b.badgeId));
      
      for (const badge of BADGE_DEFINITIONS) {
        if (unlockedBadgeIds.has(badge.id)) continue;

        let shouldUnlock = false;

        switch (badge.conditionType) {
          case 'TOTAL_SESSIONS':
            shouldUnlock = user.sessions.length >= badge.conditionValue;
            break;
          case 'TOTAL_PLAYTIME':
            const totalPlaytime = user.games.reduce((acc: number, g: any) => acc + g.totalPlaytime, 0);
            shouldUnlock = totalPlaytime >= badge.conditionValue;
            break;
          case 'SINGLE_SESSION_PLAYTIME':
            if (context.sessionDuration && context.sessionDuration >= badge.conditionValue) {
              shouldUnlock = true;
            }
            break;
          case 'PLAY_PAST_TIME':
            const latestSession = user.sessions[0];
            if (latestSession && latestSession.endTime) {
              const hour = latestSession.endTime.getHours();
              if (hour >= badge.conditionValue && hour < 6) shouldUnlock = true;
            }
            break;
          case 'PLAY_BEFORE_TIME':
            const startSession = user.sessions[0];
            if (startSession) {
              const hour = startSession.startTime.getHours();
              if (hour < badge.conditionValue) shouldUnlock = true;
            }
            break;
          case 'LIBRARY_COUNT':
            shouldUnlock = user.games.length >= badge.conditionValue;
            break;
          case 'GENRE_COUNT':
            const genres = new Set(user.games.map((g: any) => g.game.genre).filter(Boolean));
            shouldUnlock = genres.size >= badge.conditionValue;
            break;
          case 'SINGLE_GAME_LAUNCHES':
            if (context.gameId) {
              const sessionCount = user.sessions.filter((s: any) => s.gameId === context.gameId).length;
              shouldUnlock = sessionCount >= badge.conditionValue;
            }
            break;
          case 'SINGLE_GAME_PLAYTIME':
            const g = user.games.find((ug: any) => ug.gameId === context.gameId);
            if (g && g.totalPlaytime >= badge.conditionValue) shouldUnlock = true;
            break;
          case 'COMPLETE_GAME_ACHIEVEMENTS':
            // Check if any game has all achievements earned
            const gamesWithAch = user.games.filter((ug: any) => ug.game.steamAppId);
            for (const ug of gamesWithAch) {
              const gameAchs = user.gameAchievements.filter((a: any) => a.gameId === ug.gameId);
              if (gameAchs.length > 0 && gameAchs.every((a: any) => a.isEarned)) {
                shouldUnlock = true;
                break;
              }
            }
            break;
          case 'MULTIPLE_COMPLETE_GAMES':
            const completedCount = user.games.filter((ug: any) => {
               const achs = user.gameAchievements.filter((a: any) => a.gameId === ug.gameId);
               return achs.length > 0 && achs.every((a: any) => a.isEarned);
            }).length;
            shouldUnlock = completedCount >= badge.conditionValue;
            break;
          case 'SESSION_ACHIEVEMENTS':
            if (context.achievementsUnlockedInSession && context.achievementsUnlockedInSession >= badge.conditionValue) {
              shouldUnlock = true;
            }
            break;
        }

        if (shouldUnlock) {
          await this.unlockBadge(userId, badge.id);
        }
      }
    } catch (err) {
      log.error('[BadgeService] Error checking badges:', err);
    }
  }

  private async unlockBadge(userId: string, badgeId: string) {
    const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
    if (!badge) return;

    log.info(`[BadgeService] Unlocking badge ${badge.name} for user ${userId}`);
    
    await (prisma as any).userBadge.create({
      data: {
        userId,
        badgeId,
        unlockedAt: new Date()
      }
    });

    this.overlay.showTrophy({
      title: `Badge Unlocked: ${badge.name}`,
      message: badge.description,
      type: 'badge',
      iconUrl: badge.icon // Using icon string as iconUrl for now
    });
  }
}
