import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

/**
 * Ички (Golden Key) ходимлар роллари.
 * BANK_EMPLOYEE — banks.js орқали, CLIENT эса мижоз сифатида
 * бошқарилади, шунинг учун бу ерга киритилмайди.
 */
const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'LAWYER',
  'ACCOUNTANT',
];

// Ходимларни бошқариш ҳуқуқи — фақат юқори раҳбарият
const ADMIN_ROLES = ['SUPER_ADMIN', 'DIRECTOR'];

const staffSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  login: true,
  role: true,
  isActive: true,
  branchId: true,
  branch: {
    select: { id: true, name: true, city: true },
  },
  createdAt: true,
};

function clean(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

const staffSchema = z.object({
  fullName: z.string().trim().min(2, "Ф.И.Ш. киритилиши шарт"),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Email нотўғри").optional().nullable().or(z.literal('')),
  login: z.string().trim().min(3, "Логин камида 3 та белгидан иборат бўлиши керак"),
  password: z.string().min(6, "Пароль камида 6 та белгидан иборат бўлиши керак").max(200),
  role: z.enum(STAFF_ROLES, { errorMap: () => ({ message: 'Рол нотўғри' }) }),
  branchId: z.string().trim().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/users/branches
 * Форма учун филиаллар рўйхати.
 */
router.get(
  '/branches',
  allowRoles(...ADMIN_ROLES),
  async (req, res, next) => {
    try {
      const items = await prisma.branch.findMany({
        select: { id: true, name: true, city: true },
        orderBy: { name: 'asc' },
      });

      return res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users
 * Ички ходимлар рўйхати (банк ходимлари ва мижозлардан ташқари).
 */
router.get('/', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const items = await prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: staffSelect,
      orderBy: { fullName: 'asc' },
    });

    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users
 * Янги ходим қўшиш.
 */
router.post('/', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const parsed = staffSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Ходим маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // SUPER_ADMIN'ни фақат SUPER_ADMIN яратиши мумкин
    if (data.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Бош администратор ролини фақат бош администратор бера олади',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const item = await prisma.user.create({
      data: {
        fullName: data.fullName,
        phone: clean(data.phone),
        email: clean(data.email),
        login: data.login.toLowerCase(),
        passwordHash,
        role: data.role,
        branchId: clean(data.branchId),
        isActive: data.isActive !== false,
      },
      select: staffSelect,
    });

    return res.status(201).json({ item });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Бу логин ёки email аллақачон мавжуд',
      });
    }
    next(error);
  }
});

/**
 * PATCH /api/users/:id
 * Ходимни таҳрирлаш.
 */
router.patch('/:id', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const schema = staffSchema
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

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!target || !STAFF_ROLES.includes(target.role)) {
      return res.status(404).json({ error: 'Ходим топилмади' });
    }

    if (
      (target.role === 'SUPER_ADMIN' ||
        parsed.data.role === 'SUPER_ADMIN') &&
      req.user.role !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        error: 'Бош администраторни фақат бош администратор таҳрирлай олади',
      });
    }

    const data = { ...parsed.data };

    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 12);
      delete data.password;
    }

    for (const key of ['fullName', 'phone', 'email', 'branchId']) {
      if (key in data) data[key] = clean(data[key]);
    }

    const item = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: staffSelect,
    });

    return res.json({ item });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Бу email аллақачон мавжуд',
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 *
 * Ходим тарихий маълумотларга (AuditLog, мурожаатлар) боғланган
 * бўлиши мумкин, шунинг учун базадан ўчирилмайди — балки
 * "isActive: false" қилиб тизимга кириш ҳуқуқи олиб қўйилади.
 */
router.delete('/:id', allowRoles(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!target || !STAFF_ROLES.includes(target.role)) {
      return res.status(404).json({ error: 'Ходим топилмади' });
    }

    if (target.id === req.user.id) {
      return res.status(400).json({
        error: 'Ўзингизни ўчира олмайсиз',
      });
    }

    if (target.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Бош администраторни фақат бош администратор ўчира олади',
      });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { isActive: false },
    });

    return res.json({
      message: 'Ходим тизимдан ўчирилди (тизимга кира олмайди)',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
