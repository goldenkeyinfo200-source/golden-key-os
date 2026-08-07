import { Router } from 'express';

import authRouter from './auth.js';
import bankOffersRouter from './bank-offers.js';
import banksRouter from './banks.js';
import branchesRouter from './branches.js';
import casesRouter from './cases.js';
import contractsRouter from './contracts.js';
import publicContractsRouter from './public-contracts.js';
import documentsRouter from './documents.js';
import healthRouter from './health.js';
import telegramRouter from './telegram.js';
import usersRouter from './users.js';

const router = Router();

/* =========================================================
   HEALTH
========================================================= */

router.use('/health', healthRouter);

/* =========================================================
   AUTH
========================================================= */

router.use('/auth', authRouter);

/* =========================================================
   CASES
========================================================= */

router.use('/cases', casesRouter);

/* =========================================================
   BANKS
========================================================= */

router.use('/banks', banksRouter);

/* =========================================================
   BANK OFFERS
========================================================= */

router.use('/bank-offers', bankOffersRouter);

/* =========================================================
   DOCUMENTS
========================================================= */

router.use('/documents', documentsRouter);

/* =========================================================
   CONTRACTS
========================================================= */

/*
  Ички CRM шартнома маршрутлари:

  GET  /api/contracts/case/:caseId
  POST /api/contracts/case/:caseId
  POST /api/contracts/:contractId/qr
*/
router.use('/contracts', contractsRouter);

/* =========================================================
   PUBLIC CONTRACTS
========================================================= */

/*
  QR орқали мижоз очадиган очиқ маршрутлар:

  GET  /api/public/contracts/:token
  POST /api/public/contracts/:token/confirm

  Бу маршрут auth талаб қилмайди.
*/
router.use('/public', publicContractsRouter);

/* =========================================================
   TELEGRAM
========================================================= */

router.use('/telegram', telegramRouter);

/* =========================================================
   USERS
========================================================= */

router.use('/users', usersRouter);

/* =========================================================
   BRANCHES
========================================================= */

router.use('/branches', branchesRouter);

/* =========================================================
   API INFO
========================================================= */

router.get('/', (_req, res) => {
  return res.status(200).json({
    ok: true,
    name: 'Golden Key OS API',
    version: '0.6.1',

    modules: {
      health: '/api/health',

      login: '/api/auth/login',
      currentUser: '/api/auth/me',

      cases: '/api/cases',

      banks: '/api/banks',
      bankOffers: '/api/bank-offers',

      branches: '/api/branches',
      users: '/api/users',

      documents: '/api/documents',

      contracts: '/api/contracts',
      contractList: '/api/contracts/case/:caseId',
      contractQr: '/api/contracts/:contractId/qr',

      publicContract:
        '/api/public/contracts/:token',

      publicContractConfirm:
        '/api/public/contracts/:token/confirm',

      telegram: '/api/telegram',
    },
  });
});

export default router;