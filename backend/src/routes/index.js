import { Router } from 'express';

import authRouter from './auth.js';
import bankOffersRouter from './bank-offers.js';
import casesRouter from './cases.js';
import healthRouter from './health.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/cases', casesRouter);
router.use('/bank-offers', bankOffersRouter);

router.get('/', (_req, res) => {
  return res.status(200).json({
    ok: true,
    name: 'Golden Key OS API',
    version: '0.4.0',
    modules: {
      health: '/api/health',
      login: '/api/auth/login',
      currentUser: '/api/auth/me',
      cases: '/api/cases',
      caseStats: '/api/cases/stats',
      bankOffers: '/api/bank-offers',
      bankOffersHealth: '/api/bank-offers/health',
    },
  });
});

export default router;
