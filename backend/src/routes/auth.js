import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { auth } from '../middleware/auth.js';
import { createAccessToken } from '../services/token.js';
import { sendTelegramMessage } from '../services/notify.js';
import { phoneVariants } from '../utils/phone.js';

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
  bankId: true,
  bankPosition: true,
  notaryOfficeId: true,
  notaryOffice: {
    select: {
      id: true,
      name: true,
      officeNumber: true,
    },
  },
  bank: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
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
        notaryOffice: {
          select: {
            id: true,
            name: true,
            officeNumber: true,
          },
        },
        bank: {
          select: {
            id: true,
            name: true,
            shortName: true,
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

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function findByIdentifier(identifier) {
  const variants = phoneVariants(identifier);

  return prisma.user.findFirst({
    where: {
      OR: [
        { phone: { in: variants } },
        {
          login: {
            equals: identifier.toLowerCase(),
            mode: 'insensitive',
          },
        },
        {
          email: {
            equals: identifier.toLowerCase(),
            mode: 'insensitive',
          },
        },
      ],
    },
  });
}

const requestCodeSchema = z.object({
  identifier: z.string().trim().min(3, 'Телефон ёки логин киритинг'),
});

/**
 * POST /api/auth/request-code
 *
 * Ходим/банк ходими телефон рақами ёки логини орқали
 * Telegram bot орқали бир марталик код сўрайди. Шу бир хил
 * механизм — ҳам биринчи марта парол ўрнатиш, ҳам паролни
 * тиклаш учун ишлатилади.
 */
router.post('/request-code', async (req, res, next) => {
  try {
    const parsed = requestCodeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Телефон ёки логин киритинг',
      });
    }

    const user = await findByIdentifier(parsed.data.identifier);

    if (!user) {
      return res.status(404).json({
        error: 'Бу маълумот бўйича фойдаланувчи топилмади',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Фойдаланувчи фаол эмас. Администраторга мурожаат қилинг.',
      });
    }

    if (!user.telegramId) {
      return res.status(409).json({
        error:
          'Telegram боғланмаган. Аввал Golden Key OS ботида /start босиб, телефон рақамингизни юборинг, сўнг қайта уриниб кўринг.',
        code: 'TELEGRAM_NOT_LINKED',
      });
    }

    const code = generateCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCodeHash: hashCode(code),
        resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendTelegramMessage(
      user.telegramId,
      `🔐 Golden Key OS тизимига кириш учун код:\n\n<b>${code}</b>\n\nКод 10 дақиқа амал қилади. Агар буни сиз сўрамаган бўлсангиз, хабарни эътиборсиз қолдиринг.`
    );

    return res.json({
      message: 'Код Telegram орқали юборилди. Ботни текширинг.',
    });
  } catch (error) {
    next(error);
  }
});

const setPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
  code: z.string().trim().length(6, 'Код 6 та рақамдан иборат бўлиши керак'),
  newPassword: z
    .string()
    .min(6, 'Пароль камида 6 та белгидан иборат бўлиши керак')
    .max(200),
  newLogin: z.string().trim().min(3).max(100).optional().or(z.literal('')),
});

/**
 * POST /api/auth/set-password
 *
 * Telegram'дан келган кодни тасдиқлаб, янги парол
 * (ва хоҳласа янги логин) ўрнатади.
 */
router.post('/set-password', async (req, res, next) => {
  try {
    const parsed = setPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Маълумотлар нотўғри',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { identifier, code, newPassword, newLogin } = parsed.data;

    const user = await findByIdentifier(identifier);

    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      return res.status(400).json({
        error: 'Аввал код сўранг',
      });
    }

    if (user.resetCodeExpiresAt < new Date()) {
      return res.status(400).json({
        error: 'Код муддати ўтган, қайта сўранг',
      });
    }

    if (hashCode(code) !== user.resetCodeHash) {
      return res.status(400).json({
        error: 'Код нотўғри',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const data = {
      passwordHash,
      resetCodeHash: null,
      resetCodeExpiresAt: null,
    };

    if (newLogin && newLogin.toLowerCase() !== user.login) {
      data.login = newLogin.toLowerCase();
    }

    try {
      await prisma.user.update({ where: { id: user.id }, data });
    } catch (updateError) {
      if (updateError.code === 'P2002') {
        return res.status(409).json({
          error: 'Бу логин аллақачон бошқа фойдаланувчида мавжуд',
        });
      }
      throw updateError;
    }

    return res.json({
      message: 'Парол муваффақиятли ўрнатилди. Энди тизимга киришингиз мумкин.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;