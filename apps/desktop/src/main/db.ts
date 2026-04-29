import { PrismaClient } from 'prisma-client-desktop/index.js'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

// Set DATABASE_URL before PrismaClient instantiates
// Must point to userData dir so it's writable in packaged app
const dbPath = path.join(app.getPath('userData'), 'gamevault.db').replace(/\\/g, '/')
process.env.DATABASE_URL = `file:${dbPath}`
log.info(`[DB] SQLite path: ${dbPath}`)

const prisma = new PrismaClient()

// Enable WAL mode for non-blocking concurrent reads
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {})
prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {})

export default prisma
