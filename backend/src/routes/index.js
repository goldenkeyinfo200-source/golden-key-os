import { Router } from 'express';
import healthRouter from './health.js';
const router = Router();
router.use('/health', healthRouter);
router.get('/', (_req, res) => res.json({ name: 'Golden Key OS API', version: '0.1.0' }));
export default router;
