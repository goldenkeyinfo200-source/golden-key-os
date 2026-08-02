import { Router } from 'express';

import authRouter from './auth.js';
import casesRouter from './cases.js';
import healthRouter from './health.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/cases', casesRouter);

router.get('/', (_req, res) => {
  res.json({
    name: 'Golden Key OS API',
    version: '0.3.0',

    modules: {
      health: '/api/health',
      login: '/api/auth/login',
      currentUser: '/api/auth/me',
      cases: '/api/cases',
      caseStats: '/api/cases/stats',
    },
  });
});

export default router;