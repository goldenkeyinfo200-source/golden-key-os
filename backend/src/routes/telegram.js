import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { phoneVariants, normalizePhoneDigits } from '../utils/phone.js';
import { notifyNewCase } from '../services/notify.js';

const router = Router();

/**
 * Бу роутлар оддий фойдаланувчи (JWT) эмас, балки Telegram bot
 * сервиси томонидан чақирилади. Шунинг учун махсус сир (secret)
 * орқали ҳимояланади — Railway'да BOT_INTERNAL_SECRET ўзгарувчиси
 * ҳам backend'да, ҳам bot'да бир хил бўлиши керак.
 */
function checkBotSecret(req, res, next) {
  const expected = process.env.BOT_INTERNAL_SECRET;
  const provided = req.headers['x-bot-secret'];

  if (!expected || provided !== expected) {
    return res.status(401).json({
      ok: false,
      error: 'Рухсат йўқ',
    });
  }

  next();
}

router.use(checkBotSecret);

const linkSchema = z.object({
  phone: z.string().trim().min(5),
  telegramId: z.union([z.string(), z.number()]),
});

/**
 * POST /api/telegram/link
 *
 * Мижоз ёки ходим бот'да телефон рақамини юборганда,
 * шу рақам бўйича тизимдан фойдаланувчини топиб,
 * унинг telegramId'сини сақлайди.
 */
router.post('/link', async (req, res, next) => {
  try {
    const parsed = linkSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: 'Маълумот нотўғри',
      });
    }

    const { phone, telegramId } = parsed.data;
    const variants = phoneVariants(phone);
    const telegramIdStr = String(telegramId);

    // Аввал тизим ходими (User) сифатида қидирамиз
    const user = await prisma.user.findFirst({
      where: { phone: { in: variants } },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramId: telegramIdStr },
      });

      return res.json({
        ok: true,
        type: user.role === 'BANK_EMPLOYEE' ? 'bank_employee' : 'staff',
        role: user.role,
        fullName: user.fullName,
        hasPassword: Boolean(user.passwordHash),
      });
    }

    // Сўнг мижоз (Client) сифатида қидирамиз — энг сўнггисини оламиз
    const client = await prisma.client.findFirst({
      where: { phone: { in: variants } },
      orderBy: { createdAt: 'desc' },
    });

    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: { telegramId: telegramIdStr },
      });

      return res.json({
        ok: true,
        type: 'client',
        role: 'CLIENT',
        fullName: client.fullName,
      });
    }

    return res.status(404).json({
      ok: false,
      error: 'Бу телефон рақами бўйича тизимда маълумот топилмади',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telegram/cases?telegramId=...
 *
 * Мижознинг сўнгги 5 та аризаси ҳолатини қайтаради
 * (бот'даги "Заявкам ҳолати" тугмаси учун).
 */
router.get('/cases', async (req, res, next) => {
  try {
    const telegramId = req.query.telegramId;

    if (!telegramId) {
      return res.status(400).json({
        ok: false,
        error: 'telegramId талаб қилинади',
      });
    }

    const client = await prisma.client.findFirst({
      where: { telegramId: String(telegramId) },
      orderBy: { createdAt: 'desc' },
    });

    if (!client) {
      return res.json({ ok: true, items: [] });
    }

    const items = await prisma.case.findMany({
      where: { applicantClientId: client.id },
      select: {
        displayId: true,
        status: true,
        serviceType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return res.json({ ok: true, items });
  } catch (error) {
    next(error);
  }
});

const SERVICE_TYPES = [
  'PRIMARY_MORTGAGE',
  'SECONDARY_MORTGAGE',
  'MICROLOAN',
  'REALTOR_SERVICE',
  'SALE_PURCHASE',
  'CADASTRE_SERVICE',
  'OTHER',
];

const caseSchema = z.object({
  phone: z.string().trim().min(5),
  telegramId: z.union([z.string(), z.number()]),
  fullName: z.string().trim().min(3),
  serviceType: z.enum(SERVICE_TYPES),
  requestedAmount: z.union([z.number(), z.string()]).optional().nullable(),
  comment: z.string().trim().max(500).optional().nullable(),
});

function parseAmount(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized =
    typeof value === 'string'
      ? value.replace(/\s/g, '').replace(/,/g, '.')
      : value;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

async function generateCaseDisplayId(tx) {
  const year = new Date().getFullYear();
  const prefix = `GK-IP-${year}-`;

  const latestCase = await tx.case.findFirst({
    where: { displayId: { startsWith: prefix } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });

  const latestNumber = latestCase?.displayId
    ? Number(latestCase.displayId.split('-').at(-1))
    : 0;

  const nextNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;

  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
}

/**
 * POST /api/telegram/case
 *
 * Мижоз бот орқали тўлдирган янги мурожаатни яратади.
 * Телефон бўйича мавжуд мижозни топади ёки янгисини яратади
 * (ва telegramId'сини шу заҳоти боғлайди).
 */
router.post('/case', async (req, res, next) => {
  try {
    const parsed = caseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: 'Маълумотлар нотўғри',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { phone, telegramId, fullName, serviceType, comment } =
      parsed.data;
    const requestedAmount = parseAmount(parsed.data.requestedAmount);
    const variants = phoneVariants(phone);
    const telegramIdStr = String(telegramId);

    let client = await prisma.client.findFirst({
      where: { phone: { in: variants } },
      orderBy: { createdAt: 'desc' },
    });

    if (client) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          telegramId: telegramIdStr,
          fullName: client.fullName || fullName.trim(),
        },
      });
    } else {
      const digits = normalizePhoneDigits(phone);

      client = await prisma.client.create({
        data: {
          fullName: fullName.trim(),
          phone: digits.startsWith('998') ? `+${digits}` : phone.trim(),
          telegramId: telegramIdStr,
        },
      });
    }

    const branch = await prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const result = await prisma.$transaction(async (tx) => {
      const displayId = await generateCaseDisplayId(tx);

      const item = await tx.case.create({
        data: {
          displayId,
          branchId: branch?.id || null,
          applicantClientId: client.id,
          receptionManagerId: null,
          serviceType,
          status: 'NEW',
          requestedAmount,
          nextAction: comment
            ? `Мижоз изоҳи: ${comment}`
            : 'Bot орқали тушган мурожаат — менежерга бириктириш керак',
        },
      });

      await tx.caseHistory.create({
        data: {
          caseId: item.id,
          fromStatus: null,
          toStatus: 'NEW',
          note: 'Мурожаат Telegram bot орқали яратилди',
        },
      });

      return item;
    });

    notifyNewCase(result.id).catch((error) => {
      console.error(
        'Telegram: янги мурожаат хабари юборилмади',
        error.message
      );
    });

    return res.status(201).json({
      ok: true,
      displayId: result.displayId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
