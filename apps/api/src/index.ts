import './lib/env.js';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';

import prisma from './lib/prisma.js';

const app = Fastify({ 
  logger: true,
  ignoreTrailingSlash: true 
});

// Diagnostic logging
console.log('[API] Database URL (Configured):', process.env.DATABASE_URL ? 'POSTGRES (REMOTE)' : (process.env.DATABASE_LOCAL_URL ? 'SQLITE (LOCAL)' : 'NOT SET'));

app.register(fastifyCors, { 
  origin: true, 
  credentials: true 
});

app.register(fastifyRateLimit, {
  max: 120,
  timeWindow: '1 minute'
});

import { supabase } from './lib/supabase.js';

// Auth decorator
app.decorate('authenticate', async (request: any, reply: any) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return reply.code(401).send({ error: 'Invalid token format' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    console.log(`[Auth] Authenticating Supabase user: ${user.id} (${user.email})`);

    // Ensure user exists in our local DB (mapped by supabaseId)
    const localUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        email: user.email!,
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
      create: {
        supabaseId: user.id,
        email: user.email!,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        avatarUrl: user.user_metadata?.avatar_url || null,
        provider: user.app_metadata?.provider?.toUpperCase() || 'SUPABASE',
      }
    });

    request.userId = localUser.id;
    request.user = { sub: localUser.id, email: localUser.email };
    console.log(`[Auth] User authenticated: ${localUser.username} (${localUser.id})`);

    // Badge checks moved to specific trigger events (game:ended, achievement:unlocked)
    // Previously ran on every authenticated request — massive performance waste
  } catch (err: any) {
    console.error('[Auth] Authentication failed:', err.message, err);
    return reply.code(401).send({ error: `Authentication failed: ${err.message}` });
  }
});

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import achievementRoutes from './routes/achievements.js';
import challengeRoutes from './routes/challenges.js';
import playtimeRoutes from './routes/playtime.js';
import statsRoutes from './routes/stats.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';
import socialRoutes from './routes/social.js';
import badgeRoutes from './routes/badges.js';
import chatRoutes from './routes/chat.js';
import bugReportRoutes from './routes/bug-reports.js';

// Routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(gameRoutes, { prefix: '/api/games' });
app.register(achievementRoutes, { prefix: '/api/achievements' });
app.register(challengeRoutes, { prefix: '/api/challenges' });
app.register(badgeRoutes, { prefix: '/api/badges' });
app.register(playtimeRoutes, { prefix: '/api/playtime' });
app.register(statsRoutes, { prefix: '/api/stats' });
app.register(syncRoutes, { prefix: '/api/sync' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(socialRoutes, { prefix: '/api/social' });
app.register(chatRoutes, { prefix: '/api/chat' });
app.register(bugReportRoutes, { prefix: '/api/bug-reports' });

import { hydrateAllMissingMetadata } from './services/metadataService.js';
import { initBadges, checkAndAwardBadges } from './services/badgeService.js';

// Global Error Handler — never leak stack traces
app.setErrorHandler((error, request, reply) => {
  console.error(`[Error] ${request.method} ${request.url}:`, error.message);
  reply.status(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred'
  });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || process.env.API_PORT || '3001');
    // For cloud deployment (Render, Railway, etc.), must bind to 0.0.0.0
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API server running on port ${port}`);
    
    // Initialize badges
    await initBadges();
    
    // Start background hydration
    hydrateAllMissingMetadata().catch(console.error);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
