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


const trackSchema = z.object({
  telegramId: z.union([z.string(), z.number()]),
  startParam: z.string().trim().min(1).max(150),
  username: z.string().trim().max(100).optional().nullable(),
  firstName: z.string().trim().max(120).optional().nullable(),
  lastName: z.string().trim().max(120).optional().nullable(),
});

function parseStartParam(value) {
  const startParam = String(value || '').trim() || 'direct';

  if (startParam === 'direct') {
    return {
      startParam,
      source: 'DIRECT',
      campaign: 'direct',
    };
  }

  const parts = startParam.split('_').filter(Boolean);
  const sourceRaw = parts.shift() || 'unknown';

  return {
    startParam,
    source: sourceRaw.toUpperCase(),
    campaign: parts.join('_') || startParam,
  };
}

async function getLatestOpenMarketingVisit(telegramId) {
  return prisma.marketingVisit.findFirst({
    where: {
      telegramId: String(telegramId),
      convertedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}


/**
 * POST /api/telegram/track
 *
 * Telegram deep-link орқали киришни MarketingVisit жадвалига сақлайди.
 * Масалан: /start telegram_ipoteka_01
 */
router.post('/track', async (req, res, next) => {
  try {
    const parsed = trackSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: 'Tracking маълумоти нотўғри',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const telegramId = String(data.telegramId);
    const attribution = parseStartParam(data.startParam);

    const recentSameVisit = await prisma.marketingVisit.findFirst({
      where: {
        telegramId,
        startParam: attribution.startParam,
        convertedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let visit;

    if (recentSameVisit) {
      visit = await prisma.marketingVisit.update({
        where: {
          id: recentSameVisit.id,
        },
        data: {
          username: data.username || recentSameVisit.username,
          firstName: data.firstName || recentSameVisit.firstName,
          lastName: data.lastName || recentSameVisit.lastName,
        },
      });
    } else {
      visit = await prisma.marketingVisit.create({
        data: {
          telegramId,
          source: attribution.source,
          campaign: attribution.campaign,
          startParam: attribution.startParam,
          username: data.username || null,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
        },
      });
    }

    return res.json({
      ok: true,
      visitId: visit.id,
      source: visit.source,
      campaign: visit.campaign,
      startParam: visit.startParam,
    });
  } catch (error) {
    next(error);
  }
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

      await prisma.marketingVisit.updateMany({
        where: {
          telegramId: telegramIdStr,
          phoneLinkedAt: null,
        },
        data: {
          phoneLinkedAt: new Date(),
        },
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

      await prisma.marketingVisit.updateMany({
        where: {
          telegramId: telegramIdStr,
          phoneLinkedAt: null,
        },
        data: {
          phoneLinkedAt: new Date(),
        },
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
  source: z.string().trim().max(50).optional().nullable(),
  campaign: z.string().trim().max(150).optional().nullable(),
  startParameter: z.string().trim().max(150).optional().nullable(),
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

    const {
      phone,
      telegramId,
      fullName,
      serviceType,
      comment,
      source: explicitSource,
      campaign: explicitCampaign,
      startParameter: explicitStartParameter,
    } = parsed.data;
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

    const marketingVisit = await getLatestOpenMarketingVisit(telegramIdStr);

    const source =
      explicitSource ||
      marketingVisit?.source ||
      'TELEGRAM';

    const campaign =
      explicitCampaign ||
      marketingVisit?.campaign ||
      null;

    const startParameter =
      explicitStartParameter ||
      marketingVisit?.startParam ||
      null;

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
          source,
          campaign,
          startParameter,
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

    if (marketingVisit) {
      await prisma.marketingVisit.update({
        where: {
          id: marketingVisit.id,
        },
        data: {
          caseId: result.id,
          caseDisplayId: result.displayId,
          phoneLinkedAt: marketingVisit.phoneLinkedAt || new Date(),
          convertedAt: new Date(),
        },
      });
    }

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


/**
 * GET /api/telegram/marketing-stats
 *
 * Реклама воронкаси: ботга кириш → телефон → мурожаат → якунланган.
 */
router.get('/marketing-stats', async (req, res, next) => {
  try {
    const visits = await prisma.marketingVisit.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const caseIds = visits.map((item) => item.caseId).filter(Boolean);

    const completedCases = caseIds.length
      ? await prisma.case.findMany({
          where: {
            id: {
              in: caseIds,
            },
            status: 'COMPLETED',
          },
          select: {
            id: true,
          },
        })
      : [];

    const completedSet = new Set(completedCases.map((item) => item.id));
    const grouped = new Map();

    for (const visit of visits) {
      const key = `${visit.source}::${visit.campaign}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          source: visit.source,
          campaign: visit.campaign,
          startParameter: visit.startParam,
          botStarts: 0,
          phoneLinked: 0,
          casesCreated: 0,
          completed: 0,
        });
      }

      const row = grouped.get(key);
      row.botStarts += 1;

      if (visit.phoneLinkedAt) {
        row.phoneLinked += 1;
      }

      if (visit.caseId || visit.convertedAt) {
        row.casesCreated += 1;
      }

      if (visit.caseId && completedSet.has(visit.caseId)) {
        row.completed += 1;
      }
    }

    const items = Array.from(grouped.values()).map((row) => ({
      ...row,
      phoneConversion:
        row.botStarts > 0
          ? Math.round((row.phoneLinked / row.botStarts) * 1000) / 10
          : 0,
      caseConversion:
        row.botStarts > 0
          ? Math.round((row.casesCreated / row.botStarts) * 1000) / 10
          : 0,
    }));

    return res.json({
      ok: true,
      items,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
