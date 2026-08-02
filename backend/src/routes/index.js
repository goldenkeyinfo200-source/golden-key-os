import { Router } from 'express';

import authRouter from './auth.js';
import healthRouter from './health.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);

router.get('/', (_req, res) => {
  res.json({
    name: 'Golden Key OS API',
    version: '0.2.0',
    modules: {
      health: '/api/health',
      login: '/api/auth/login',
      currentUser: '/api/auth/me',
    },
  });
});

export default router;