import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

export async function authenticate(request: any, reply: FastifyReply) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    // Just-in-time user creation in our local database
    let localUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });

    if (!localUser) {
      const email = user.email || '';
      const username = user.user_metadata?.username || email.split('@')[0] || `user_${user.id.slice(0, 5)}`;
      
      try {
        localUser = await prisma.user.create({
          data: {
            supabaseId: user.id,
            email: email,
            username: username,
            avatarUrl: user.user_metadata?.avatar_url || null,
            provider: user.app_metadata?.provider?.toUpperCase() || 'SUPABASE',
            providerId: user.id
          }
        });
      } catch (createError) {
        console.error('Failed to create local user record:', createError);
      }
    }

    request.userId = localUser?.id;
    request.user = { sub: localUser?.id, email: localUser?.email };
  } catch (err) {
    console.error('Authentication error:', err);
    return reply.code(500).send({ error: 'Authentication service error' });
  }
}
