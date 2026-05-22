import prisma from '../lib/prisma.js';

export async function checkAndAwardBadges(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { badges: true }
  });

  if (!user) return [];

  const awardedBadges = [];

  // 1. Welcome Badge (The First Step)
  const welcomeBadge = await prisma.badge.findFirst({
    where: { code: 'WELCOME' }
  });

  console.log(`[BadgeService] Checking badges for user: ${userId}`);
  if (welcomeBadge) {
    const alreadyHas = user.badges.some((ub: any) => ub.badgeId === welcomeBadge.id);
    console.log(`[BadgeService] Welcome badge found: ${welcomeBadge.id}, alreadyHas: ${alreadyHas}`);
    if (!alreadyHas) {
      try {
        const unlock = await prisma.userBadge.create({
          data: {
            userId,
            badgeId: welcomeBadge.id,
          },
          include: { badge: true }
        });
        console.log(`[BadgeService] Awarded WELCOME badge to ${userId}`);
        awardedBadges.push(unlock.badge);
      } catch (err: any) {
        if (err.code !== 'P2002') {
          console.error(`[BadgeService] Failed to award WELCOME badge: ${err.message}`);
        } else {
          console.log(`[BadgeService] Welcome badge already exists (race condition)`);
        }
      }
    }
  } else {
    console.warn(`[BadgeService] WELCOME badge NOT FOUND in database!`);
  }

  // Add more badge checks here...
  
  return awardedBadges;
}

export async function initBadges() {
  const badges = [
    {
      code: 'WELCOME',
      name: 'The First Step',
      description: 'Welcome to GameVault! Your journey begins here.',
      icon: 'sparkles',
      color: '#8b5cf6',
      rarity: 'COMMON',
      conditionType: 'INITIAL_LOGIN',
      conditionValue: 1
    },
    {
      code: 'COLLECTOR_10',
      name: 'Rising Collector',
      description: 'Add 10 games to your vault.',
      icon: 'library',
      color: '#34d399',
      rarity: 'UNCOMMON',
      conditionType: 'LIBRARY_COUNT',
      conditionValue: 10
    },
    {
      code: 'COMPLETIONIST_1',
      name: 'Mission Complete',
      description: 'Finish your first game.',
      icon: 'trophy',
      color: '#fbbf24',
      rarity: 'RARE',
      conditionType: 'COMPLETION_COUNT',
      conditionValue: 1
    },
    {
      code: 'SOCIAL_BUTTERFLY',
      name: 'Social Butterfly',
      description: 'Send 50 messages in global chat.',
      icon: 'message-square',
      color: '#c084fc',
      rarity: 'COMMON',
      conditionType: 'CHAT_COUNT',
      conditionValue: 50
    },
    {
      code: 'MARATHON_RUNNER',
      name: 'Marathon Runner',
      description: 'Accumulate 100 hours of total playtime.',
      icon: 'clock',
      color: '#60a5fa',
      rarity: 'EPIC',
      conditionType: 'TOTAL_PLAYTIME',
      conditionValue: 360000 // 100 hours in seconds
    },
    {
      code: 'NIGHT_OWL',
      name: 'Night Owl',
      description: 'Play games for 5 hours after midnight.',
      icon: 'moon',
      color: '#475569',
      rarity: 'UNCOMMON',
      conditionType: 'NIGHT_PLAYTIME',
      conditionValue: 18000
    },
    {
      code: 'PERFECTIONIST_5',
      name: 'Perfectionist',
      description: 'Complete 5 games 100%.',
      icon: 'star',
      color: '#f59e0b',
      rarity: 'LEGENDARY',
      conditionType: 'COMPLETION_100_COUNT',
      conditionValue: 5
    },
    {
      code: 'VAULT_MASTER',
      name: 'Vault Master',
      description: 'Add 100 games to your library.',
      icon: 'shield',
      color: '#ef4444',
      rarity: 'LEGENDARY',
      conditionType: 'LIBRARY_COUNT',
      conditionValue: 100
    },
    {
      code: 'FRIENDLY_NEIGHBOR',
      name: 'Friendly Neighbor',
      description: 'Add 5 friends to your social hub.',
      icon: 'users',
      color: '#10b981',
      rarity: 'UNCOMMON',
      conditionType: 'FRIEND_COUNT',
      conditionValue: 5
    },
    {
      code: 'EARLY_ADOPTER',
      name: 'Early Adopter',
      description: 'Be one of the first to join GameVault.',
      icon: 'zap',
      color: '#f43f5e',
      rarity: 'EPIC',
      conditionType: 'USER_ID_THRESHOLD',
      conditionValue: 1000
    },
    {
      code: 'REVIEWER',
      name: 'The Critic',
      description: 'Rate and review 10 games.',
      icon: 'edit-3',
      color: '#a855f7',
      rarity: 'COMMON',
      conditionType: 'REVIEW_COUNT',
      conditionValue: 10
    },
    {
      code: 'REPLAY_FAN',
      name: 'One More Time',
      description: 'Mark 5 games for replay.',
      icon: 'rotate-ccw',
      color: '#22d3ee',
      rarity: 'UNCOMMON',
      conditionType: 'REPLAY_LIST_COUNT',
      conditionValue: 5
    },
    {
      code: 'BUG_HUNTER',
      name: 'Bug Hunter',
      description: 'Submit your first bug report.',
      icon: 'bug',
      color: '#f87171',
      rarity: 'COMMON',
      conditionType: 'BUG_REPORT_COUNT',
      conditionValue: 1
    },
    {
      code: 'ACHIEVEMENT_HUNTER',
      name: 'Trophy Collector',
      description: 'Earn 100 unique achievements.',
      icon: 'award',
      color: '#eab308',
      rarity: 'EPIC',
      conditionType: 'ACHIEVEMENT_COUNT',
      conditionValue: 100
    },
    {
      code: 'GENRE_EXPLORER',
      name: 'Genre Explorer',
      description: 'Play games from 5 different genres.',
      icon: 'map',
      color: '#34d399',
      rarity: 'UNCOMMON',
      conditionType: 'GENRE_COUNT',
      conditionValue: 5
    },
    {
      code: 'SPEEDRUNNER_INIT',
      name: 'Fast Lane',
      description: 'Finish a game in under 5 hours.',
      icon: 'flame',
      color: '#ea580c',
      rarity: 'RARE',
      conditionType: 'SPEEDRUN_COUNT',
      conditionValue: 1
    },
    {
      code: 'STEADY_GAMER',
      name: 'Steady Hand',
      description: 'Play for at least 1 hour every day for a week.',
      icon: 'calendar',
      color: '#6366f1',
      rarity: 'RARE',
      conditionType: 'STREAK_DAYS',
      conditionValue: 7
    },
    {
      code: 'HARDCORE_PLAYER',
      name: 'Hardcore',
      description: 'Play for 12 hours in a single session.',
      icon: 'swords',
      color: '#991b1b',
      rarity: 'LEGENDARY',
      conditionType: 'MAX_SESSION_TIME',
      conditionValue: 43200
    },
    {
      code: 'CLOUD_SYNCER',
      name: 'Cloud Walker',
      description: 'Sync your Steam library.',
      icon: 'cloud',
      color: '#38bdf8',
      rarity: 'COMMON',
      conditionType: 'SYNC_COUNT',
      conditionValue: 1
    },
    {
      code: 'LEGENDARY_FOUNDER',
      name: 'Founding Legend',
      description: 'Complete all 100% CLUB challenges.',
      icon: 'crown',
      color: '#facc15',
      rarity: 'LEGENDARY',
      conditionType: 'ALL_CHALLENGES',
      conditionValue: 1
    }
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: b,
      create: b
    });
  }
}
