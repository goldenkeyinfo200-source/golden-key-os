import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import {
  notifyBankAssignment,
  notifyBankReview,
} from '../services/notify.js';

const router = Router();

const ADMIN_ROLES = ['SUPER_ADMIN', 'DIRECTOR'];

const bankSchema = z.object({
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().max(80).optional().or(z.literal('')),
  inn: z.string().trim().max(30).optional().or(z.literal('')),
  mfo: z.string().trim().max(20).optional().or(z.literal('')),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

const employeeSchema = z.object({
  fullName: z.string().trim().min(3).max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  login: z.string().trim().min(3).max(100),
  password: z.string().min(6).max(200),
  bankPosition: z.string().trim().max(120).optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

const assignmentSchema = z.object({
  bankIds: z.array(z.string().trim().min(1)).min(1),
});

const reviewSchema = z.object({
  status: z.enum([
    'VIEWED',
    'UNDER_REVIEW',
    'NEEDS_DOCUMENTS',
    'REJECTED',
  ]).optional(),
  katmStatus: z.string().trim().max(100).optional().or(z.literal('')),
  katmNote: z.string().trim().max(1500).optional().or(z.literal('')),
  collateralStatus: z.string().trim().max(100).optional().or(z.literal('')),
  collateralNote: z.string().trim().max(1500).optional().or(z.literal('')),
});

const clean = (value) => {
  if (typeof value !== 'string') return value ?? null;
  const normalized = value.trim();
  return normalized || null;
};

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.bank.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            employees: true,
            assignments: true,
            offers: true,
          },
        },
      },
    });

    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = bankSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Банк маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const item = await prisma.bank.create({
      data: {
        name: parsed.data.name,
        shortName: clean(parsed.data.shortName),
        inn: clean(parsed.data.inn),
        mfo: clean(parsed.data.mfo),
        licenseNumber: clean(parsed.data.licenseNumber),
        address: clean(parsed.data.address),
        phone: clean(parsed.data.phone),
        email: clean(parsed.data.email),
        isActive: parsed.data.isActive ?? true,
      },
    });

    return res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

router.patch('/:bankId', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = bankSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Банк маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      data[key] = typeof value === 'string' ? clean(value) : value;
    }

    const item = await prisma.bank.update({
      where: { id: req.params.bankId },
      data,
    });

    return res.json({ item });
  } catch (error) {
    next(error);
  }
});

router.get('/:bankId/employees', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const items = await prisma.user.findMany({
      where: {
        bankId: req.params.bankId,
        role: 'BANK_EMPLOYEE',
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        bankPosition: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/:bankId/employees', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Банк ходими маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const bank = await prisma.bank.findUnique({
      where: { id: req.params.bankId },
    });

    if (!bank) {
      return res.status(404).json({ error: 'Банк топилмади' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const item = await prisma.user.create({
      data: {
        bankId: bank.id,
        fullName: parsed.data.fullName,
        phone: clean(parsed.data.phone),
        email: clean(parsed.data.email),
        login: parsed.data.login.toLowerCase(),
        passwordHash,
        bankPosition: clean(parsed.data.bankPosition),
        role: 'BANK_EMPLOYEE',
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        bankPosition: true,
        isActive: true,
      },
    });

    return res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

router.patch('/employees/:userId', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const schema = employeeSchema
      .omit({ password: true, login: true })
      .partial()
      .extend({
        password: z.string().min(6).max(200).optional(),
      });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Ходим маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = { ...parsed.data };

    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 12);
      delete data.password;
    }

    for (const key of ['fullName', 'phone', 'email', 'bankPosition']) {
      if (key in data) data[key] = clean(data[key]);
    }

    const item = await prisma.user.update({
      where: { id: req.params.userId },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        login: true,
        bankPosition: true,
        isActive: true,
      },
    });

    return res.json({ item });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/banks/employees/:userId
 *
 * Диққат: ходим кириш тарихи (AuditLog), банк таклифлари ва
 * мурожаат текширувлари билан боғланган бўлиши мумкин, шунинг
 * учун базадан бутунлай ўчирилмайди — балки "isActive: false"
 * қилиб, тизимга кириш ва янги ишларга бириктирилиш ҳуқуқи
 * олиб қўйилади. Тарихий маълумотлар (ким нима қилганлиги)
 * сақланиб қолади.
 */
router.delete(
  '/employees/:userId',
  allowRoles(...ADMIN_ROLES),
  async (req, res, next) => {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: req.params.userId },
      });

      if (!employee || employee.role !== 'BANK_EMPLOYEE') {
        return res.status(404).json({ error: 'Ходим топилмади' });
      }

      await prisma.user.update({
        where: { id: employee.id },
        data: { isActive: false },
      });

      return res.json({
        message: 'Ходим тизимдан ўчирилди (тизимга кира олмайди)',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/cases/:caseId/assign', allowRoles(
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER'
), async (req, res, next) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Камида битта банкни танланг',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const caseItem = await prisma.case.findUnique({
      where: { id: req.params.caseId },
    });

    if (!caseItem) {
      return res.status(404).json({ error: 'Мурожаат топилмади' });
    }

    const banks = await prisma.bank.findMany({
      where: {
        id: { in: parsed.data.bankIds },
        isActive: true,
      },
      select: { id: true },
    });

    const validIds = banks.map((item) => item.id);

    const result = await prisma.$transaction(async (tx) => {
      for (const bankId of validIds) {
        await tx.caseBankAssignment.upsert({
          where: {
            caseId_bankId: {
              caseId: caseItem.id,
              bankId,
            },
          },
          create: {
            caseId: caseItem.id,
            bankId,
            status: 'SENT',
          },
          update: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      }

      await tx.case.update({
        where: { id: caseItem.id },
        data: {
          status: 'BANK_REVIEW',
          nextAction: 'Бириктирилган банклар жавобини кутиш',
        },
      });

      return tx.caseBankAssignment.findMany({
        where: { caseId: caseItem.id },
        include: {
          bank: true,
          assignedBankEmployee: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    for (const bankId of validIds) {
      notifyBankAssignment(caseItem.id, bankId).catch((error) => {
        console.error(
          'Telegram: банкка бириктириш хабари юборилмади',
          error.message
        );
      });
    }

    return res.json({
      message: 'Мурожаат банкларга юборилди',
      items: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cases/:caseId/assignments', async (req, res, next) => {
  try {
    const where = {
      caseId: req.params.caseId,
    };

    if (req.user.role === 'BANK_EMPLOYEE') {
      if (!req.user.bankId) {
        return res.json({ items: [] });
      }
      where.bankId = req.user.bankId;
    }

    const items = await prisma.caseBankAssignment.findMany({
      where,
      include: {
        bank: true,
        assignedBankEmployee: {
          select: {
            id: true,
            fullName: true,
          },
        },
        offers: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.patch('/assignments/:assignmentId/review', allowRoles('BANK_EMPLOYEE'), async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Текширув маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const assignment = await prisma.caseBankAssignment.findUnique({
      where: { id: req.params.assignmentId },
    });

    if (!assignment || assignment.bankId !== req.user.bankId) {
      return res.status(403).json({
        error: 'Ушбу банк топшириғига рухсатингиз йўқ',
      });
    }

    const item = await prisma.caseBankAssignment.update({
      where: { id: assignment.id },
      data: {
        assignedBankEmployeeId: req.user.id,
        status: parsed.data.status || 'UNDER_REVIEW',
        katmStatus: clean(parsed.data.katmStatus),
        katmNote: clean(parsed.data.katmNote),
        collateralStatus: clean(parsed.data.collateralStatus),
        collateralNote: clean(parsed.data.collateralNote),
        viewedAt: assignment.viewedAt || new Date(),
      },
      include: { bank: true },
    });

    notifyBankReview(item.id).catch((error) => {
      console.error(
        'Telegram: банк текшируви хабари юборилмади',
        error.message
      );
    });

    return res.json({ item });
  } catch (error) {
    next(error);
  }
});

export default router;
