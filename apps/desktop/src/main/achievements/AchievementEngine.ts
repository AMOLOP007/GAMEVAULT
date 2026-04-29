import { EventEmitter } from 'events';
import prisma from '../db.js';

export const BUILT_IN_ACHIEVEMENTS = [
  { key: 'first_launch',      title: 'First Boot',         description: 'Launch your first game with GameVault', condition: JSON.stringify({ type: 'session_count', value: 1 }) },
  { key: 'hour_one',          title: 'One Hour In',        description: 'Play a game for 1 hour', condition: JSON.stringify({ type: 'total_playtime_gte', seconds: 3600 }) },
  { key: 'ten_hours',         title: 'Committed',          description: 'Play a game for 10 hours', condition: JSON.stringify({ type: 'total_playtime_gte', seconds: 36000 }) },
  { key: 'fifty_hours',       title: 'Veteran',            description: 'Play a game for 50 hours', condition: JSON.stringify({ type: 'total_playtime_gte', seconds: 180000 }) },
  { key: 'hundred_hours',     title: 'Century',            description: 'Play a game for 100 hours', condition: JSON.stringify({ type: 'total_playtime_gte', seconds: 360000 }) },
  { key: 'daily_streak_3',    title: 'On a Roll',          description: 'Play for 3 days in a row', condition: JSON.stringify({ type: 'daily_streak', days: 3 }) },
  { key: 'daily_streak_7',    title: 'Week Warrior',       description: 'Play for 7 days in a row', condition: JSON.stringify({ type: 'daily_streak', days: 7 }) },
  { key: 'night_owl',         title: 'Night Owl',          description: 'Start a session after 11 PM', condition: JSON.stringify({ type: 'session_start_after_hour', hour: 23 }) },
  { key: 'early_bird',        title: 'Early Bird',         description: 'Start a session before 7 AM', condition: JSON.stringify({ type: 'session_start_before_hour', hour: 7 }) },
  { key: 'marathon',          title: 'Marathon Runner',    description: 'Play a single session for 4 hours', condition: JSON.stringify({ type: 'single_session_gte', seconds: 14400 }) },
  { key: 'library_5',         title: 'Collector',          description: 'Add 5 games to your library', condition: JSON.stringify({ type: 'games_in_library_gte', count: 5 }) },
  { key: 'library_10',        title: 'Archivist',          description: 'Add 10 games to your library', condition: JSON.stringify({ type: 'games_in_library_gte', count: 10 }) },
  { key: 'comeback',          title: 'Long Time No See',   description: 'Play a game after 30 days of absence', condition: JSON.stringify({ type: 'days_since_last_session_gte', days: 30 }) },
  { key: 'completionist',     title: 'Completionist',      description: 'Complete your first game', condition: JSON.stringify({ type: 'status_completed_count_gte', count: 1 }) },
];

export class AchievementEngine extends EventEmitter {
  async seedBuiltInAchievements(gameId: string) {
    for (const ach of BUILT_IN_ACHIEVEMENTS) {
      await (prisma.achievement as any).upsert({
        where: { gameId_key: { gameId, key: ach.key } },
        update: {},
        create: { ...ach, gameId }
      });
    }
  }

  async checkAllAchievements(userId: string, gameId: string) {
    const unearned = await (prisma.achievement as any).findMany({
      where: {
        gameId,
        earned: { none: { userId } }
      }
    });

    const userGame = await (prisma.userGame as any).findUnique({
      where: { userId_gameId: { userId, gameId } }
    });

    if (!userGame) return;

    for (const ach of unearned) {
      const condition = JSON.parse(ach.condition);
      let earned = false;

      switch (condition.type) {
        case 'total_playtime_gte':
          if (userGame.totalPlaytime >= condition.seconds) earned = true;
          break;
        case 'session_count':
          const sessionCount = await (prisma.playSession as any).count({ where: { userId, gameId } });
          if (sessionCount >= condition.value) earned = true;
          break;
        // ... more conditions can be implemented here
      }

      if (earned) {
        await (prisma.userAchievement as any).create({
          data: { userId, achievementId: ach.id }
        });
        this.emit('achievement:unlocked', { ...ach, userId });
      }
    }
  }
}
