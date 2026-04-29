import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { addExternalLink, removeExternalLink, getGameLinks } from '../services/linkService.js';

export default async function linksRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  const addLinkSchema = z.object({
    userGameId: z.string(),
    url: z.string().url(),
    label: z.string().min(1),
    tag: z.enum(['OFFICIAL', 'STORE', 'MOD', 'GUIDE', 'BACKUP', 'OTHER']).optional(),
  });

  // GET /api/links/:userGameId
  fastify.get<{ Params: { userGameId: string } }>('/:userGameId', async (request: any, reply) => {
    try {
      const links = await getGameLinks(request.userId!, request.params.userGameId);
      return { success: true, data: links };
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/links
  fastify.post('/', async (request: any, reply) => {
    try {
      const body = addLinkSchema.parse(request.body);
      const link = await addExternalLink(request.userId!, body);
      return reply.code(201).send({ success: true, data: link });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // DELETE /api/links/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request: any, reply) => {
    try {
      const result = await removeExternalLink(request.userId!, request.params.id);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
}
