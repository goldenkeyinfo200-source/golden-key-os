import crypto from 'node:crypto';

import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import { defaultContractHtml } from '../services/contract-template.js';
import { createSignedFileUrl } from '../services/supabaseStorage.js';

const router = Router();

const MANAGE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'LAWYER',
];

const createSchema = z.object({
  borrowerId: z.string().trim().optional().nullable(),
  templateId: z.string().trim().optional().nullable(),
});

const qrSchema = z.object({
  expiresInMinutes: z.coerce.number().int().min(2).max(60).default(15),
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateContractDisplayId(tx) {
  const year = new Date().getFullYear();
  const prefix = `GK-SH-${year}-`;

  const latest = await tx.contract.findFirst({
    where: {
      displayId: {
        startsWith: prefix,
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

  const nextNumber = Number.isFinite(latestNumber)
    ? latestNumber + 1
    : 1;

  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
}

async function getCaseForContract(caseId) {
  return prisma.case.findUnique({
    where: {
      id: caseId,
    },
    include: {
      applicant: true,
      bankOffers: {
        where: {
          status: 'SELECTED',
        },
        orderBy: {
          selectedAt: 'desc',
        },
        take: 1,
      },
      borrowers: {
        where: {
          status: {
            in: ['APPROVED', 'ACTIVE'],
          },
        },
        orderBy: {
          sequence: 'asc',
        },
      },
    },
  });
}

async function resolveTemplate(tx, caseItem, requestedTemplateId) {
  if (requestedTemplateId) {
    const template = await tx.contractTemplate.findUnique({
      where: {
        id: requestedTemplateId,
      },
    });

    if (!template || !template.isActive) {
      const error = new Error('Фаол шартнома шаблони топилмади');
      error.status = 404;
      throw error;
    }

    return template;
  }

  let template = await tx.contractTemplate.findFirst({
    where: {
      serviceType: caseItem.serviceType,
      isActive: true,
    },
    orderBy: {
      version: 'desc',
    },
  });

  if (!template) {
    template = await tx.contractTemplate.create({
      data: {
        name: `${caseItem.serviceType} — асосий шаблон`,
        serviceType: caseItem.serviceType,
        version: 1,
        htmlBody: defaultContractHtml(),
        isActive: true,
      },
    });
  }

  return template;
}

router.use(auth);

router.get(
  '/case/:caseId',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const items = await prisma.contract.findMany({
        where: {
          caseId: req.params.caseId,
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
          invitations: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              expiresAt: true,
              usedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const itemsWithPdf = await Promise.all(
        items.map(async (item) => ({
          ...item,
          pdfUrl: item.pdfUrl
            ? await createSignedFileUrl(item.pdfUrl, 60 * 60 * 24)
            : null,
        }))
      );

      return res.json({
        items: itemsWithPdf,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/case/:caseId',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = createSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Шартнома маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await getCaseForContract(req.params.caseId);

      if (!caseItem) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const borrowerId =
        parsed.data.borrowerId ||
        caseItem.borrowers[0]?.id ||
        null;

      const item = await prisma.$transaction(async (tx) => {
        const template = await resolveTemplate(
          tx,
          caseItem,
          parsed.data.templateId
        );

        const displayId = await generateContractDisplayId(tx);

        const contract = await tx.contract.create({
          data: {
            displayId,
            caseId: caseItem.id,
            borrowerId,
            templateId: template.id,
            status: 'READY_TO_SIGN',
          },
          include: {
            template: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
          },
        });

        const previousStatus = caseItem.status;

        if (caseItem.status !== 'CONTRACT_PENDING') {
          await tx.case.update({
            where: {
              id: caseItem.id,
            },
            data: {
              status: 'CONTRACT_PENDING',
            },
          });

          await tx.caseHistory.create({
            data: {
              caseId: caseItem.id,
              fromStatus: previousStatus,
              toStatus: 'CONTRACT_PENDING',
              note: `${displayId} шартномаси тасдиқлашга тайёрланди`,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Contract',
            entityId: contract.id,
            action: 'CONTRACT_CREATED',
            metadata: {
              caseId: caseItem.id,
              displayId,
              templateId: template.id,
            },
          },
        });

        return contract;
      });

      return res.status(201).json({
        message: 'Шартнома яратилди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:contractId/qr',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = qrSchema.safeParse(req.body || {});

      if (!parsed.success) {
        return res.status(400).json({
          error: 'QR-код муддати нотўғри',
        });
      }

      const contract = await prisma.contract.findUnique({
        where: {
          id: req.params.contractId,
        },
        include: {
          case: {
            select: {
              id: true,
              displayId: true,
            },
          },
        },
      });

      if (!contract) {
        return res.status(404).json({
          error: 'Шартнома топилмади',
        });
      }

      if (contract.status === 'SIGNED') {
        return res.status(409).json({
          error: 'Шартнома аллақачон тасдиқланган',
        });
      }

      if (contract.status === 'CANCELLED') {
        return res.status(409).json({
          error: 'Бекор қилинган шартнома учун QR яратиб бўлмайди',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(
        Date.now() + parsed.data.expiresInMinutes * 60 * 1000
      );

      await prisma.$transaction(async (tx) => {
        await tx.invitation.deleteMany({
          where: {
            contractId: contract.id,
            usedAt: null,
          },
        });

        await tx.invitation.create({
          data: {
            tokenHash,
            caseId: contract.caseId,
            contractId: contract.id,
            expiresAt,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Contract',
            entityId: contract.id,
            action: 'CONTRACT_QR_CREATED',
            metadata: {
              caseId: contract.caseId,
              expiresAt: expiresAt.toISOString(),
            },
          },
        });
      });

      const publicBaseUrl =
        process.env.PUBLIC_SIGN_URL?.replace(/\/+$/, '') ||
        process.env.CRM_PUBLIC_URL?.replace(/\/+$/, '') ||
        'http://localhost:5173/sign';

      const signUrl = `${publicBaseUrl}/${token}`;
      const qrDataUrl = await QRCode.toDataURL(signUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 420,
      });

      return res.json({
        message: 'Бир марталик QR-код яратилди',
        contractId: contract.id,
        contractDisplayId: contract.displayId,
        expiresAt,
        signUrl,
        qrDataUrl,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/:contractId/pdf',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const { finalizeSignedContract } = await import(
        '../services/contract-finalize.js'
      );

      const contract = await prisma.contract.findUnique({
        where: {
          id: req.params.contractId,
        },
        include: {
          invitations: {
            where: {
              usedAt: {
                not: null,
              },
            },
            orderBy: {
              usedAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!contract) {
        return res.status(404).json({
          error: 'Шартнома топилмади',
        });
      }

      if (contract.status !== 'SIGNED' || !contract.signedAt) {
        return res.status(409).json({
          error: 'PDF фақат тасдиқланган шартнома учун яратилади',
        });
      }

      const invitation = contract.invitations[0];

      const result = await finalizeSignedContract({
        contractId: contract.id,
        confirmation: {
          invitationId: invitation?.id || 'manual-regeneration',
          signedAt: contract.signedAt,
          ip: null,
          userAgent: 'Golden Key OS manual PDF generation',
        },
      });

      return res.json({
        message: 'Шартнома PDF тайёр',
        item: {
          contractId: contract.id,
          pdfUrl: result.pdfUrl,
          telegram: result.telegram,
          reused: result.reused,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
