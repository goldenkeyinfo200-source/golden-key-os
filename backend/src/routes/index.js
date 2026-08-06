import { Router } from 'express';

import authRouter from './auth.js';
import bankOffersRouter from './bank-offers.js';
import banksRouter from './banks.js';
import branchesRouter from './branches.js'; // ✅ Янги қўшилди
import casesRouter from './cases.js';
import contractsRouter from './contracts.js';
import documentsRouter from './documents.js';
import healthRouter from './health.js';
import telegramRouter from './telegram.js';
import usersRouter from './users.js';

const router = Router();

// Health
router.use('/health', healthRouter);

// Auth
router.use('/auth', authRouter);

// Cases
router.use('/cases', casesRouter);

// Banks
router.use('/banks', banksRouter);

// Bank offers
router.use('/bank-offers', bankOffersRouter);

// Documents
router.use('/documents', documentsRouter);

// Contracts
router.use('/contracts', contractsRouter);

// Telegram
router.use('/telegram', telegramRouter);

// Users
router.use('/users', usersRouter);

// Branches (Филиаллар) ✅ Янги қўшилди
router.use('/branches', branchesRouter);

// API маълумоти
router.get('/', (_req, res) => {
  return res.status(200).json({
    ok: true,
    name: 'Golden Key OS API',
    version: '0.6.0',
    modules: {
      health: '/api/health',
      login: '/api/auth/login',
      currentUser: '/api/auth/me',
      cases: '/api/cases',
      banks: '/api/banks',
      branches: '/api/branches', // ✅ Янги
      users: '/api/users',
      bankOffers: '/api/bank-offers',
      documents: '/api/documents',
      contracts: '/api/contracts',
      telegram: '/api/telegram',
    },
  });
});

export default router;