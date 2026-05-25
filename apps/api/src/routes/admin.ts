import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  // SECURITY: All admin routes require authentication
  fastify.addHook('preHandler', (fastify as any).authenticate);

  fastify.get('/usage', async () => {
    // Mock usage data for now, ideally read from a Supabase table
    const { count } = await supabase
      .from('game_metadata_cache')
      .select('*', { count: 'exact', head: true });

    return {
      rawgDaily: 145,
      rawgMonthly: 4500,
      cacheSize: count || 0,
      isOnline: true
    };
  });

  // DELETE /api/admin/clear-library
  fastify.delete('/clear-library', { preHandler: [(fastify as any).authenticate] }, async (request: any, reply) => {
    const userId = request.user.sub;
    await prisma.userGame.deleteMany({
      where: { userId }
    });
    return { success: true, message: 'Library cleared' };
  });
}
