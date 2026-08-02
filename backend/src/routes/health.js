import { Router } from 'express';
import { prisma } from '../config/prisma.js';
const router = Router();
router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'golden-key-os-backend', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
export default router;
