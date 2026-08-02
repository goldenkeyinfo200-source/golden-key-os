import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { auth } from '../middleware/auth.js';
import { createAccessToken } from '../services/token.js';

const router = Router();

const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, 'Логин камида 3 та белгидан иборат бўлиши керак')
    .max(100, 'Логин жуда узун'),

  password: z
    .string()
    .min(6, 'Пароль камида 6 та белгидан иборат бўлиши керак')
    .max(200, 'Пароль жуда узун'),
});

const publicUserSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  login: true,
  telegramId: true,
  role: true,
  isActive: true,
  companyId: true,
  branchId: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      city: true,
    },
  },
};

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Киритилган маълумотлар нотўғри',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const login = parsed.data.login.toLowerCase();
    const password = parsed.data.password;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            login: {
              equals: login,
              mode: 'insensitive',
            },
          },
          {
            email: {
              equals: login,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: 'Логин ёки пароль нотўғри',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Фойдаланувчи фаол эмас. Администраторга мурожаат қилинг.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Логин ёки пароль нотўғри',
      });
    }

    const token = createAccessToken(user);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'LOGIN',
        metadata: {
          ip:
            req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
            req.ip ??
            null,
          userAgent: req.headers['user-agent'] ?? null,
        },
      },
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return res.json({
      message: 'Тизимга муваффақиятли кирилди',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', auth, async (req, res) => {
  return res.json({
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 *
 * JWT серверда сақланмагани учун токен CRM томонида ўчирилади.
 * Бу endpoint ҳаракатни журналга ёзади.
 */
router.post('/logout', auth, async (req, res, next) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        entityType: 'User',
        entityId: req.user.id,
        action: 'LOGOUT',
      },
    });

    return res.json({
      message: 'Тизимдан чиқилди',
    });
  } catch (error) {
    next(error);
  }
});

export default router;