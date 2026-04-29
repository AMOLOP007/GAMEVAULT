import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

export default async function bugReportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/bug-reports', async (request, reply) => {
    const { title, description, category } = request.body as any;
    const userId = (request.user as any).id;

    const report = await prisma.bugReport.create({
      data: {
        title,
        description,
        category,
        userId,
      }
    });

    return { data: report };
  });

  fastify.get('/bug-reports', async (request, reply) => {
    const reports = await prisma.bugReport.findMany({
      where: { userId: (request.user as any).id },
      orderBy: { createdAt: 'desc' }
    });
    return { data: reports };
  });
}
