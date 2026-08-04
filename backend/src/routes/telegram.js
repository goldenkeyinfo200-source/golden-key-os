import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';

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

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

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
    const normalizedPhone = normalizePhone(phone);
    const telegramIdStr = String(telegramId);

    // Аввал тизим ходими (User) сифатида қидирамиз
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramId: telegramIdStr },
      });

      return res.json({
        ok: true,
        type: 'staff',
        role: user.role,
        fullName: user.fullName,
      });
    }

    // Сўнг мижоз (Client) сифатида қидирамиз — энг сўнггисини оламиз
    const client = await prisma.client.findFirst({
      where: { phone: normalizedPhone },
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

export default router;
