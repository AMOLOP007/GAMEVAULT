import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GameVault database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@gamevault.dev' },
    update: {},
    create: {
      email: 'demo@gamevault.dev',
      username: 'DemoPlayer',
      passwordHash,
      avatarUrl: null,
    },
  });
  console.log(`  ✓ User: ${user.username} (${user.email})`);

  // Seed games (genre/platform stored as JSON strings for SQLite)
  const gamesData = [
    {
      title: 'Elden Ring',
      slug: 'elden-ring',
      description: 'An action RPG set in a vast open world.',
      genre: JSON.stringify(['RPG', 'Action']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox']),
      developer: 'FromSoftware',
      publisher: 'Bandai Namco',
      coverUrl: 'https://media.rawg.io/media/games/5ec/5ecac5cb026ec26a56efcc546364e348.jpg',
    },
    {
      title: 'Cyberpunk 2077',
      slug: 'cyberpunk-2077',
      description: 'An open-world RPG set in a dystopian future.',
      genre: JSON.stringify(['RPG', 'Action', 'Open World']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox']),
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      coverUrl: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg',
    },
    {
      title: 'The Witcher 3: Wild Hunt',
      slug: 'the-witcher-3-wild-hunt',
      description: 'An award-winning open world RPG.',
      genre: JSON.stringify(['RPG', 'Adventure']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox', 'Nintendo Switch']),
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      coverUrl: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6571c2.jpg',
    },
    {
      title: 'Hades',
      slug: 'hades',
      description: 'A rogue-like dungeon crawler.',
      genre: JSON.stringify(['Action', 'Roguelike', 'Indie']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox', 'Nintendo Switch']),
      developer: 'Supergiant Games',
      publisher: 'Supergiant Games',
      coverUrl: 'https://media.rawg.io/media/games/1f4/1f47a270b8f241e4571e04e1cfed8e92.jpg',
    },
    {
      title: 'Hollow Knight',
      slug: 'hollow-knight',
      description: 'A challenging 2D action-adventure.',
      genre: JSON.stringify(['Metroidvania', 'Action', 'Indie']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox', 'Nintendo Switch']),
      developer: 'Team Cherry',
      publisher: 'Team Cherry',
      coverUrl: 'https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg',
    },
    {
      title: 'Red Dead Redemption 2',
      slug: 'red-dead-redemption-2',
      description: 'An epic tale of life in America\'s unforgiving heartland.',
      genre: JSON.stringify(['Action', 'Adventure', 'Open World']),
      platform: JSON.stringify(['PC', 'PlayStation', 'Xbox']),
      developer: 'Rockstar Games',
      publisher: 'Rockstar Games',
      coverUrl: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg',
    },
  ];

  const statuses = ['PLAYING', 'COMPLETED', 'PLAYING', 'COMPLETED', 'BACKLOG', 'PLAYING'];
  const playtimes = [86400, 54000, 180000, 28800, 0, 43200]; // seconds

  const games = [];
  for (const data of gamesData) {
    const game = await prisma.game.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });
    games.push(game);
    console.log(`  ✓ Game: ${game.title}`);
  }

  // Create user-game associations with varied statuses
  for (let i = 0; i < games.length; i++) {
    const userGame = await prisma.userGame.upsert({
      where: { userId_gameId: { userId: user.id, gameId: games[i].id } },
      update: {},
      create: {
        userId: user.id,
        gameId: games[i].id,
        status: statuses[i],
        totalPlaytime: playtimes[i],
        rating: statuses[i] === 'COMPLETED' ? Math.floor(Math.random() * 2) + 4 : null,
        isFavorite: i < 2,
        lastPlayedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  ✓ Library: ${games[i].title} → ${statuses[i]}`);

    // Add some play sessions
    if (playtimes[i] > 0) {
      const sessionCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < sessionCount; j++) {
        const startTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const duration = Math.floor(Math.random() * 7200) + 1800;
        await prisma.playSession.create({
          data: {
            userId: user.id,
            userGameId: userGame.id,
            startTime,
            endTime: new Date(startTime.getTime() + duration * 1000),
            duration,
          },
        });
      }
    }

    // Add external links for some games
    if (i < 3) {
      await prisma.externalLink.create({
        data: {
          userGameId: userGame.id,
          url: `https://store.steampowered.com/app/${1000 + i}`,
          label: 'Steam Store',
          tag: 'STORE',
        },
      });
    }
  }

  // Add achievements for Elden Ring
  const achievements = ['Elden Lord', 'Shardbearer', 'Age of Stars', 'Dragonlord'];
  for (const name of achievements) {
    await prisma.achievement.upsert({
      where: { gameId_name: { gameId: games[0].id, name } },
      update: {},
      create: {
        gameId: games[0].id,
        name,
        description: `Unlock the ${name} ending`,
      },
    });
  }

  console.log('\n✅ Seeding complete!');
  console.log(`   Demo login: demo@gamevault.dev / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
