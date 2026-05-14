import prisma from '../db.js';
import log from 'electron-log';
import { TrophyOverlay } from '../overlay/TrophyOverlay.js';
import { startOfDay, startOfWeek, isSameDay, isSameWeek } from 'date-fns';

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  type: 'PLAYTIME' | 'ACHIEVEMENTS' | 'GAMES_LAUNCHED' | 'STREAK';
  category: 'DAILY' | 'WEEKLY' | 'MILESTONE' | 'STREAK';
  targetValue: number;
}

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  // Daily Challenges
  { id: 'daily_30m', title: 'Daily Dose', description: 'Play for 30 minutes today', type: 'PLAYTIME', category: 'DAILY', targetValue: 1800 },
  { id: 'daily_1h', title: 'Power Hour', description: 'Play for 1 hour today', type: 'PLAYTIME', category: 'DAILY', targetValue: 3600 },
  { id: 'daily_launch', title: 'Quick Dip', description: 'Launch any game today', type: 'GAMES_LAUNCHED', category: 'DAILY', targetValue: 1 },
  { id: 'daily_achieve', title: 'Daily Hunter', description: 'Unlock 1 achievement today', type: 'ACHIEVEMENTS', category: 'DAILY', targetValue: 1 },

  // Weekly Challenges
  { id: 'weekly_10h', title: 'Weekly Warrior', description: 'Play for 10 hours this week', type: 'PLAYTIME', category: 'WEEKLY', targetValue: 36000 },
  { id: 'weekly_variety', title: 'Variety Pack', description: 'Launch 5 different games this week', type: 'GAMES_LAUNCHED', category: 'WEEKLY', targetValue: 5 },
  { id: 'weekly_trophies', title: 'Trophy Collector', description: 'Unlock 10 achievements this week', type: 'ACHIEVEMENTS', category: 'WEEKLY', targetValue: 10 },
  { id: 'weekly_marathon', title: 'Weekend Warrior', description: 'Play for 4 hours in a single session this week', type: 'PLAYTIME', category: 'WEEKLY', targetValue: 14400 },

  // Milestones
  { id: 'milestone_100h', title: 'Centurion', description: 'Total playtime of 100 hours', type: 'PLAYTIME', category: 'MILESTONE', targetValue: 360000 },
  { id: 'milestone_500h', title: 'The Architect', description: 'Total playtime of 500 hours', type: 'PLAYTIME', category: 'MILESTONE', targetValue: 1800000 },
  { id: 'milestone_1000h', title: 'Grandmaster', description: 'Total playtime of 1000 hours', type: 'PLAYTIME', category: 'MILESTONE', targetValue: 3600000 },
  { id: 'milestone_50_games', title: 'Library Lord', description: 'Own 50 games in your library', type: 'GAMES_LAUNCHED', category: 'MILESTONE', targetValue: 50 },
  { id: 'milestone_100_achievements', title: 'Completionist Lite', description: 'Unlock 100 achievements total', type: 'ACHIEVEMENTS', category: 'MILESTONE', targetValue: 100 },

  // Streaks
  { id: 'streak_3d', title: '3-Day Streak', description: 'Launch a game 3 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 3 },
  { id: 'streak_5d', title: 'High Five', description: 'Launch a game 5 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 5 },
  { id: 'streak_7d', title: 'Weekly Streak', description: 'Launch a game 7 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 7 },
  { id: 'streak_14d', title: 'Fortnight Fanatic', description: 'Launch a game 14 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 14 },
  { id: 'streak_30d', title: 'Monthly Habit', description: 'Launch a game 30 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 30 },
  { id: 'streak_60d', title: 'Hardcore Gamer', description: 'Launch a game 60 days in a row', type: 'STREAK', category: 'STREAK', targetValue: 60 },
  { id: 'streak_365d', title: 'Year of Gaming', description: 'Launch a game every day for a year', type: 'STREAK', category: 'STREAK', targetValue: 365 },
];

export class ChallengeService {
  private overlay: TrophyOverlay;

  constructor(overlay: TrophyOverlay) {
    this.overlay = overlay;
  }

  async init() {
    log.info('[ChallengeService] Initializing challenges in database...');
    for (const challenge of CHALLENGE_DEFINITIONS) {
      await (prisma as any).challenge.upsert({
        where: { id: challenge.id },
        update: {
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          category: challenge.category,
          targetValue: challenge.targetValue,
        },
        create: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          category: challenge.category,
          targetValue: challenge.targetValue,
        }
      });
    }
  }

  async trackProgress(userId: string, data: { 
    type: 'PLAYTIME' | 'ACHIEVEMENTS' | 'GAMES_LAUNCHED', 
    value: number,
    gameId?: string 
  }) {
    try {
      const now = new Date();
      const today = startOfDay(now);
      const thisWeek = startOfWeek(now);

      // Get active challenges for this user
      const userChallenges = await (prisma as any).userChallenge.findMany({
        where: { userId },
        include: { challenge: true }
      });

      // Initialize missing user challenges
      const existingChallengeIds = new Set(userChallenges.map((uc: any) => uc.challengeId));
      for (const challenge of CHALLENGE_DEFINITIONS) {
        if (!existingChallengeIds.has(challenge.id)) {
          const uc = await (prisma as any).userChallenge.create({
            data: { userId, challengeId: challenge.id, status: 'ACTIVE' },
            include: { challenge: true }
          });
          userChallenges.push(uc);
        }
      }

      for (const uc of userChallenges) {
        if (uc.status !== 'ACTIVE') continue; // Only process active challenges
        const challenge = uc.challenge;
        if (challenge.type !== data.type && challenge.type !== 'STREAK') continue;

        let progressChanged = false;
        let newValue = uc.currentProgress;

        // Reset logic for DAILY/WEEKLY
        if (challenge.category === 'DAILY') {
          const lastUpdated = startOfDay(new Date(uc.lastUpdated));
          if (!isSameDay(lastUpdated, today)) {
            newValue = 0; // Reset daily
          }
        } else if (challenge.category === 'WEEKLY') {
          const lastUpdated = startOfWeek(new Date(uc.lastUpdated));
          if (!isSameWeek(lastUpdated, thisWeek)) {
            newValue = 0; // Reset weekly
          }
        }

        // Apply progress
        if (challenge.type === data.type) {
          if (data.type === 'PLAYTIME' || data.type === 'ACHIEVEMENTS') {
            newValue += data.value;
          } else if (data.type === 'GAMES_LAUNCHED') {
            // For varietypack/etc, we should probably track unique gameIds in ChallengeProgress
            newValue += 1;
          }
          progressChanged = true;
        }

        // Handle STREAK separately on GAMES_LAUNCHED
        if (challenge.type === 'STREAK' && data.type === 'GAMES_LAUNCHED') {
          const lastUpdated = startOfDay(new Date(uc.lastUpdated));
          const yesterday = startOfDay(new Date(now.getTime() - 86400000));
          
          if (isSameDay(lastUpdated, yesterday)) {
            newValue = uc.streakCount + 1;
            progressChanged = true;
          } else if (!isSameDay(lastUpdated, today)) {
            newValue = 1; // Reset streak if missed a day
            progressChanged = true;
          }
        }

        if (progressChanged) {
          const isCompleted = newValue >= challenge.targetValue;
          await (prisma as any).userChallenge.update({
            where: { id: uc.id },
            data: {
              currentProgress: newValue,
              streakCount: challenge.type === 'STREAK' ? newValue : uc.streakCount,
              status: isCompleted ? 'COMPLETED' : 'ACTIVE',
              completedAt: isCompleted ? now : uc.completedAt,
              lastUpdated: now
            }
          });

          if (isCompleted && uc.status === 'ACTIVE') {
            this.notifyCompletion(userId, challenge);
          }
        }
      }
    } catch (err) {
      log.error('[ChallengeService] Error tracking progress:', err);
    }
  }

  private notifyCompletion(userId: string, challenge: any) {
    this.overlay.showTrophy({
      title: `Challenge Completed!`,
      message: `${challenge.title}: ${challenge.description}`,
      type: 'challenge',
      iconUrl: '🎯'
    });
  }
}
