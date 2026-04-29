import { PrismaClient } from 'prisma-client-api/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_LOCAL_URL || process.env.DATABASE_URL
    }
  }
});

// PERF: WAL mode enables non-blocking concurrent reads during heartbeat writes
// Must be the first DB operation before any queries
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {});
prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {});

export default prisma;
