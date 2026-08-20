import crypto from 'node:crypto';

import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import { createSignedFileUrl } from '../services/supabaseStorage.js';

const router = Router();

const MANAGE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'LAWYER',
];

const documentSchema = z.object({
  name: z.string().trim().min(2).max(200),
  series: z.string().trim().max(50).optional().nullable(),
  number: z.string().trim().max(100).optional().nullable(),
  kind: z.enum(['ORIGINAL', 'COPY', 'NOTARIZED_COPY', 'ELECTRONIC_COPY', 'OTHER']).default('ORIGINAL'),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  conditionOnReceipt: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const handoverSchema = z.object({
  type: z.enum(['RECEIPT', 'RETURN']),
  documentItemIds: z.array(z.string().trim().min(1)).min(1).max(100),
  note: z.string().trim().max(1000).optional().nullable(),
});

const completionSchema = z.object({
  summary: z.string().trim().max(2000).optional().nullable(),
  clientClaims: z.string().trim().max(2000).optional().nullable(),
  items: z.array(
    z.object({
      title: z.string().trim().min(2).max(500),
      details: z.string().trim().max(2000).optional().nullable(),
      completed: z.boolean().default(true),
    })
  ).min(1).max(100),
});

const qrSchema = z.object({
  expiresInMinutes: z.coerce.number().int().min(2).max(60).default(15),
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateDisplayId(tx, modelName, prefix) {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  const latest = await tx[modelName].findFirst({
    where: {
      displayId: {
        startsWith: fullPrefix,
      },
    },
    orderBy: {
      displayId: 'desc',
    },
    select: {
      displayId: true,
    },
  });

  const latestNumber = latest?.displayId
    ? Number(latest.displayId.split('-').at(-1))
    : 0;

  return `${fullPrefix}${String((Number.isFinite(latestNumber) ? latestNumber : 0) + 1).padStart(6, '0')}`;
}

function realtorDirectionLabel(caseItem) {
  const code =
    String(caseItem.nextAction || '').match(/Риэлторлик йўналиши:\s*([A-Z_]+)/)?.[1] || '';

  return ({
    SELL: 'Уй сотиш',
    BUY: 'Уй сотиб олиш',
    RENT_OUT: 'Ижарага бериш',
    RENT_IN: 'Ижарага олиш',
    NOTARY_DOCUMENTS: 'Ҳужжатларни нотариусга тайёрлаш',
    CADASTRE_ASSISTANCE: 'Кадастр хизматларини кўрсатишда ёрдам',
    INHERITANCE_ASSISTANCE: 'Мерос ишларини расмийлаштиришда ёрдам',
  })[code] || null;
}

async function getCase(caseId) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      applicant: true,
    },
  });
}

async function signedUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  try {
    return await createSignedFileUrl(path, 60 * 60 * 24);
  } catch {
    return null;
  }
}

router.use(auth);

router.get(
  '/case/:caseId',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const caseItem = await getCase(req.params.caseId);

      if (!caseItem) {
        return res.status(404).json({ error: 'Мурожаат топилмади' });
      }

      const [documents, handovers, completionActs] = await Promise.all([
        prisma.clientDocumentItem.findMany({
          where: { caseId: caseItem.id },
          orderBy: [{ status: 'asc' }, { receivedAt: 'desc' }],
        }),
        prisma.documentHandover.findMany({
          where: { caseId: caseItem.id },
          include: {
            items: {
              include: {
                documentItem: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.serviceCompletionAct.findMany({
          where: { caseId: caseItem.id },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const handoversWithUrls = await Promise.all(
        handovers.map(async (item) => ({
          ...item,
          pdfUrl: await signedUrl(item.pdfUrl),
        }))
      );

      const completionWithUrls = await Promise.all(
        completionActs.map(async (item) => ({
          ...item,
          pdfUrl: await signedUrl(item.pdfUrl),
        }))
      );

      return res.json({
        item: {
          caseId: caseItem.id,
          caseDisplayId: caseItem.displayId,
          clientFullName: caseItem.applicant?.fullName || '—',
          serviceType: caseItem.serviceType,
          serviceDirection: realtorDirectionLabel(caseItem),
          documents,
          handovers: handoversWithUrls,
          completionActs: completionWithUrls,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/case/:caseId/documents',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = documentSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Ҳужжат маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await getCase(req.params.caseId);
      if (!caseItem) return res.status(404).json({ error: 'Мурожаат топилмади' });

      const item = await prisma.clientDocumentItem.create({
        data: {
          caseId: caseItem.id,
          ...parsed.data,
          series: parsed.data.series || null,
          number: parsed.data.number || null,
          conditionOnReceipt: parsed.data.conditionOnReceipt || null,
          notes: parsed.data.notes || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          entityType: 'ClientDocumentItem',
          entityId: item.id,
          action: 'CLIENT_DOCUMENT_RECEIVED',
          metadata: {
            caseId: caseItem.id,
            caseDisplayId: caseItem.displayId,
            name: item.name,
            kind: item.kind,
            quantity: item.quantity,
          },
        },
      });

      return res.status(201).json({
        message: 'Ҳужжат рўйхатга қўшилди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/documents/:documentId',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const item = await prisma.clientDocumentItem.findUnique({
        where: { id: req.params.documentId },
        include: {
          handoverItems: {
            take: 1,
          },
        },
      });

      if (!item) return res.status(404).json({ error: 'Ҳужжат топилмади' });

      if (item.handoverItems.length > 0) {
        return res.status(409).json({
          error: 'Далолатномага киритилган ҳужжатни ўчириб бўлмайди',
        });
      }

      await prisma.clientDocumentItem.delete({
        where: { id: item.id },
      });

      return res.json({ message: 'Ҳужжат рўйхатдан ўчирилди' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/case/:caseId/handovers',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = handoverSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Далолатнома маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await getCase(req.params.caseId);
      if (!caseItem) return res.status(404).json({ error: 'Мурожаат топилмади' });

      const uniqueIds = [...new Set(parsed.data.documentItemIds)];

      const documents = await prisma.clientDocumentItem.findMany({
        where: {
          caseId: caseItem.id,
          id: { in: uniqueIds },
        },
      });

      if (documents.length !== uniqueIds.length) {
        return res.status(400).json({
          error: 'Танланган ҳужжатлардан бири ушбу мурожаатга тегишли эмас',
        });
      }

      if (
        parsed.data.type === 'RETURN' &&
        documents.some((item) => item.status === 'RETURNED')
      ) {
        return res.status(409).json({
          error: 'Қайтарилган ҳужжатни қайтадан қайтариш далолатномасига қўшиб бўлмайди',
        });
      }

      const item = await prisma.$transaction(async (tx) => {
        const displayId = await generateDisplayId(
          tx,
          'documentHandover',
          parsed.data.type === 'RECEIPT' ? 'GK-HQ' : 'GK-HR'
        );

        const handover = await tx.documentHandover.create({
          data: {
            displayId,
            caseId: caseItem.id,
            type: parsed.data.type,
            status: 'READY_TO_SIGN',
            note: parsed.data.note || null,
            items: {
              create: documents.map((document) => ({
                documentItemId: document.id,
                quantity: document.quantity,
                conditionNote:
                  parsed.data.type === 'RECEIPT'
                    ? document.conditionOnReceipt
                    : document.conditionOnReturn,
              })),
            },
          },
          include: {
            items: {
              include: {
                documentItem: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'DocumentHandover',
            entityId: handover.id,
            action:
              parsed.data.type === 'RECEIPT'
                ? 'DOCUMENT_RECEIPT_ACT_CREATED'
                : 'DOCUMENT_RETURN_ACT_CREATED',
            metadata: {
              caseId: caseItem.id,
              displayId,
              documentIds: uniqueIds,
            },
          },
        });

        return handover;
      });

      return res.status(201).json({
        message:
          parsed.data.type === 'RECEIPT'
            ? 'Ҳужжатларни қабул қилиш далолатномаси тайёрланди'
            : 'Ҳужжатларни қайтариш далолатномаси тайёрланди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/handovers/:handoverId/qr',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = qrSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'QR-код муддати нотўғри' });
      }

      const handover = await prisma.documentHandover.findUnique({
        where: { id: req.params.handoverId },
        include: { case: true },
      });

      if (!handover) return res.status(404).json({ error: 'Далолатнома топилмади' });
      if (handover.status === 'SIGNED') {
        return res.status(409).json({ error: 'Далолатнома аллақачон тасдиқланган' });
      }
      if (['CANCELLED', 'ARCHIVED'].includes(handover.status)) {
        return res.status(409).json({ error: 'Ушбу далолатнома учун QR яратиб бўлмайди' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(
        Date.now() + parsed.data.expiresInMinutes * 60 * 1000
      );
      const purpose =
        handover.type === 'RECEIPT'
          ? 'DOCUMENT_RECEIPT_CONFIRM'
          : 'DOCUMENT_RETURN_CONFIRM';

      await prisma.$transaction(async (tx) => {
        await tx.invitation.deleteMany({
          where: {
            documentHandoverId: handover.id,
            usedAt: null,
          },
        });

        await tx.invitation.create({
          data: {
            tokenHash,
            caseId: handover.caseId,
            documentHandoverId: handover.id,
            purpose,
            signerRole: 'CLIENT',
            expiresAt,
          },
        });

        await tx.documentHandover.update({
          where: { id: handover.id },
          data: { status: 'READY_TO_SIGN' },
        });
      });

      const publicBaseUrl =
        process.env.PUBLIC_API_URL?.replace(/\/+$/, '') ||
        `${req.protocol}://${req.get('host')}`;

      const signUrl = `${publicBaseUrl}/api/public-acts/${token}`;
      const qrDataUrl = await QRCode.toDataURL(signUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 420,
      });

      return res.json({
        message: 'Бир марталик QR-код яратилди',
        item: {
          id: handover.id,
          displayId: handover.displayId,
          type: handover.type,
          expiresAt,
          signUrl,
          qrDataUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/case/:caseId/completion-acts',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = completionSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Бажарилган ишлар маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await getCase(req.params.caseId);
      if (!caseItem) return res.status(404).json({ error: 'Мурожаат топилмади' });

      const item = await prisma.$transaction(async (tx) => {
        const displayId = await generateDisplayId(
          tx,
          'serviceCompletionAct',
          'GK-BA'
        );

        const act = await tx.serviceCompletionAct.create({
          data: {
            displayId,
            caseId: caseItem.id,
            status: 'READY_TO_SIGN',
            serviceType: caseItem.serviceType,
            serviceDirection: realtorDirectionLabel(caseItem),
            summary: parsed.data.summary || null,
            clientClaims: parsed.data.clientClaims || null,
            items: {
              create: parsed.data.items.map((row, index) => ({
                title: row.title,
                details: row.details || null,
                completed: row.completed,
                sortOrder: index,
              })),
            },
          },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'ServiceCompletionAct',
            entityId: act.id,
            action: 'SERVICE_COMPLETION_ACT_CREATED',
            metadata: {
              caseId: caseItem.id,
              displayId,
              itemCount: parsed.data.items.length,
            },
          },
        });

        return act;
      });

      return res.status(201).json({
        message: 'Бажарилган ишлар далолатномаси тайёрланди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/completion-acts/:actId/qr',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = qrSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'QR-код муддати нотўғри' });
      }

      const act = await prisma.serviceCompletionAct.findUnique({
        where: { id: req.params.actId },
      });

      if (!act) return res.status(404).json({ error: 'Далолатнома топилмади' });
      if (act.status === 'SIGNED') {
        return res.status(409).json({ error: 'Далолатнома аллақачон тасдиқланган' });
      }
      if (['CANCELLED', 'ARCHIVED'].includes(act.status)) {
        return res.status(409).json({ error: 'Ушбу далолатнома учун QR яратиб бўлмайди' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(
        Date.now() + parsed.data.expiresInMinutes * 60 * 1000
      );

      await prisma.$transaction(async (tx) => {
        await tx.invitation.deleteMany({
          where: {
            serviceCompletionActId: act.id,
            usedAt: null,
          },
        });

        await tx.invitation.create({
          data: {
            tokenHash,
            caseId: act.caseId,
            serviceCompletionActId: act.id,
            purpose: 'SERVICE_COMPLETION_CONFIRM',
            signerRole: 'CLIENT',
            expiresAt,
          },
        });

        await tx.serviceCompletionAct.update({
          where: { id: act.id },
          data: { status: 'READY_TO_SIGN' },
        });
      });

      const publicBaseUrl =
        process.env.PUBLIC_API_URL?.replace(/\/+$/, '') ||
        `${req.protocol}://${req.get('host')}`;

      const signUrl = `${publicBaseUrl}/api/public-acts/${token}`;
      const qrDataUrl = await QRCode.toDataURL(signUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 420,
      });

      return res.json({
        message: 'Бир марталик QR-код яратилди',
        item: {
          id: act.id,
          displayId: act.displayId,
          expiresAt,
          signUrl,
          qrDataUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
