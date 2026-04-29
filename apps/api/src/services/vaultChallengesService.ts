import prisma from '../lib/prisma.js';

interface Challenge {
  id: string;
  title: string;
  message: string;
  condition: (context: any) => boolean;
}

const VAULT_CHALLENGES: Challenge[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    message: 'Welcome to the Vault! You added your first game.',
    condition: (ctx) => ctx.totalGames >= 1
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    message: 'Burning the midnight oil? (2 AM - 5 AM session)',
    condition: (ctx) => {
      const hour = new Date().getHours();
      return hour >= 2 && hour < 5;
    }
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    message: 'Nothing like gaming with morning coffee. (5 AM - 8 AM session)',
    condition: (ctx) => {
      const hour = new Date().getHours();
      return hour >= 5 && hour < 8;
    }
  },
  {
    id: 'marathon',
    title: 'Marathon Gamer',
    message: 'A 4+ hour gaming session? That is dedication.',
    condition: (ctx) => ctx.duration >= 4 * 3600
  },
  {
    id: 'focused',
    title: 'Deep Focus',
    message: 'Played for 2 hours without closing the game.',
    condition: (ctx) => ctx.duration >= 2 * 3600
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    message: 'Making the most of your days off!',
    condition: (ctx) => {
      const day = new Date().getDay();
      return (day === 0 || day === 6) && ctx.duration >= 3600;
    }
  },
  {
    id: 'lunch_break',
    title: 'Lunch Break',
    message: 'A quick session before getting back to work.',
    condition: (ctx) => {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      return day >= 1 && day <= 5 && hour >= 12 && hour < 14;
    }
  },
  {
    id: 'the_collector',
    title: 'The Collector',
    message: 'Your library has reached 10+ games!',
    condition: (ctx) => ctx.totalGames >= 10
  },
  {
    id: 'curator',
    title: 'Library Curator',
    message: 'You have organized and categorized your games.',
    condition: (ctx) => ctx.categorizedGames >= 5
  },
  {
    id: 'dedicated',
    title: 'Daily Habit',
    message: 'Played the same game 3 days in a row.',
    condition: (ctx) => ctx.streak >= 3
  },
  {
    id: 'variety',
    title: 'Variety King',
    message: 'You have played 3 different genres this week.',
    condition: (ctx) => ctx.genresCount >= 3
  },
  {
    id: 'analytics_pro',
    title: 'The Architect',
    message: 'You have spent time analyzing your performance.',
    condition: (ctx) => ctx.analyticsViews >= 5
  },
  {
    id: 'steam_migrator',
    title: 'Steam Migrator',
    message: 'Successfully synced your Steam collection.',
    condition: (ctx) => ctx.hasSyncedSteam
  },
  {
    id: 'trophy_hunter',
    title: 'Trophy Hunter',
    message: 'You have earned 5 official trophies via Steam.',
    condition: (ctx) => ctx.officialTrophies >= 5
  },
  {
    id: 'discovery_pioneer',
    title: 'Discovery Pioneer',
    message: 'Used the Discovery tool to find new games.',
    condition: (ctx) => ctx.discoveryUses >= 1
  },
  {
    id: 'deep_dive',
    title: 'Deep Dive',
    message: 'Accumulated 24 hours of total playtime!',
    condition: (ctx) => ctx.totalPlaytime >= 24 * 3600
  },
  {
    id: 'vault_veteran',
    title: 'Vault Veteran',
    message: 'You have been using GameVault for 7 days.',
    condition: (ctx) => ctx.daysInVault >= 7
  },
  {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    message: 'Checked the Social Hub to see what friends are playing.',
    condition: (ctx) => ctx.socialViews >= 5
  },
  {
    id: 'completionist_spirit',
    title: 'Completionist Spirit',
    message: 'Reached 50% achievements in a game.',
    condition: (ctx) => ctx.maxCompletion >= 50
  },
  {
    id: 'retro_return',
    title: 'Old Friend',
    message: 'Returned to a game you havent played in 30 days.',
    condition: (ctx) => ctx.returnAfterDays >= 30
  }
];

export class VaultChallengesService {
  async checkChallenges(userId: string, gameId: string, context: any) {
    const unlocked = [];

    // Augment context with DB stats
    const totalGames = await prisma.userGame.count({ where: { userId } });
    const categorizedGames = await prisma.userGame.count({ 
      where: { userId, status: { not: 'playing' } } 
    });
    const totalPlaytime = await prisma.userGame.aggregate({
      where: { userId },
      _sum: { totalPlaytime: true }
    });
    const officialTrophies = await prisma.gameAchievement.count({
      where: { userId, source: 'steam', isEarned: true }
    });
    
    const augmentedCtx = {
      ...context,
      totalGames,
      categorizedGames,
      totalPlaytime: totalPlaytime._sum.totalPlaytime || 0,
      officialTrophies
    };

    for (const challenge of VAULT_CHALLENGES) {
      const existing = await prisma.gameAchievement.findUnique({
        where: {
          userId_gameId_key: {
            userId,
            gameId,
            key: challenge.id
          }
        }
      });

      if (existing?.isEarned) continue;

      if (challenge.condition(augmentedCtx)) {
        await prisma.gameAchievement.upsert({
          where: {
            userId_gameId_key: {
              userId,
              gameId,
              key: challenge.id
            }
          },
          update: { isEarned: true, earnedAt: new Date() },
          create: {
            userId,
            gameId,
            key: challenge.id,
            name: challenge.title,
            description: challenge.message,
            isEarned: true,
            earnedAt: new Date(),
            source: 'vault'
          }
        });
        unlocked.push(challenge);
      }
    }

    return unlocked;
  }
}

export const vaultChallenges = new VaultChallengesService();
