import { PrismaClient } from 'prisma-client-api/index.js';

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_LOCAL_URL;

if (!dbUrl) {
  console.error('❌ [Prisma] DATABASE_URL or DATABASE_LOCAL_URL is not defined in environment!');
} else {
  console.log(`📡 [Prisma] Initializing client with ${dbUrl.split(':')[0]} datasource...`);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

// PERF: WAL mode enables non-blocking concurrent reads during heartbeat writes
// Must be the first DB operation before any queries
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {});
prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {});

export default prisma;
