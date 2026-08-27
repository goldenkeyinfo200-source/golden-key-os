import { Router } from 'express';

import authRouter from './auth.js';
import appraisalsRouter from './appraisals.js';
import bankOffersRouter from './bank-offers.js';
import banksRouter from './banks.js';
import branchesRouter from './branches.js';
import casesRouter from './cases.js';
import contractsRouter from './contracts.js';
import publicContractsRouter from './public-contracts.js';
import documentsRouter from './documents.js';
import debtorsRouter from './debtors.js';
import financeRouter from './finance.js';
import healthRouter from './health.js';
import kiosksRouter from './kiosks.js';
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
   APPRAISALS
========================================================= */

router.use('/appraisals', appraisalsRouter);

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
   FINANCE
========================================================= */

router.use('/finance', financeRouter);

/* =========================================================
   DEBTORS
========================================================= */

router.use('/debtors', debtorsRouter);

/* =========================================================
   CONTRACTS
========================================================= */

router.use('/contracts', contractsRouter);

/* =========================================================
   PUBLIC CONTRACTS
========================================================= */

router.use('/public', publicContractsRouter);

/* =========================================================
   KIOSK QR DISPLAYS
========================================================= */

router.use('/kiosks', kiosksRouter);

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
    version: '0.7.0',
    modules: {
      health: '/api/health',
      login: '/api/auth/login',
      currentUser: '/api/auth/me',
      appraisals: '/api/appraisals',
      cases: '/api/cases',
      banks: '/api/banks',
      bankOffers: '/api/bank-offers',
      branches: '/api/branches',
      users: '/api/users',
      documents: '/api/documents',
      finance: '/api/finance',
      debtors: '/api/debtors',
      contracts: '/api/contracts',
      contractList: '/api/contracts/case/:caseId',
      contractQr: '/api/contracts/:contractId/qr',
      publicContract: '/api/public/contracts/:token',
      publicContractConfirm: '/api/public/contracts/:token/confirm',
      kiosks: '/api/kiosks',
      kioskDisplay: '/api/kiosks/display/:deviceCode?token=...',
      telegram: '/api/telegram',
    },
  });
});

export default router;
