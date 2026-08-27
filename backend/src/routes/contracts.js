import crypto from 'node:crypto';

import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import {
  defaultContractHtml,
  investorPartnershipContractHtml,
  realtorContractHtml,
  salePurchaseContractHtml,
} from '../services/contract-template.js';
import {
  createSignedFileUrl,
  deleteStorageFile,
} from '../services/supabaseStorage.js';

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
  serviceFee: z.coerce.number().positive().optional().nullable(),
});

const qrSchema = z.object({
  expiresInMinutes: z.coerce.number().int().min(2).max(60).default(15),
  kioskId: z.string().trim().min(1).optional().nullable(),
  signerRole: z.enum(['CLIENT', 'SELLER', 'BUYER']).optional().default('CLIENT'),
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateContractDisplayId(tx, serviceType) {
  const year = new Date().getFullYear();

  const prefix =
    serviceType === 'REALTOR_SERVICE'
      ? `GK-RX-${year}-`
      : serviceType === 'SALE_PURCHASE'
        ? `GK-OS-${year}-`
        : serviceType === 'INVESTOR_PARTNERSHIP'
          ? `GK-IV-${year}-`
          : `GK-SH-${year}-`;

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
        include: {
          client: true,
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

  if (caseItem.serviceType === 'REALTOR_SERVICE') {
    const marker = 'data-gk-template="realtor-service-v3"';

    const current = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'REALTOR_SERVICE',
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (current?.htmlBody?.includes(marker)) {
      return current;
    }

    const latest = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'REALTOR_SERVICE',
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });

    return tx.contractTemplate.create({
      data: {
        name: 'Риэлторлик хизматларини кўрсатиш шартномаси',
        serviceType: 'REALTOR_SERVICE',
        version: (latest?.version || 0) + 1,
        htmlBody: realtorContractHtml(),
        isActive: true,
      },
    });
  }

  if (caseItem.serviceType === 'SALE_PURCHASE') {
    const marker = 'data-gk-template="sale-purchase-v2"';

    const current = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'SALE_PURCHASE',
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (current?.htmlBody?.includes(marker)) {
      return current;
    }

    const latest = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'SALE_PURCHASE',
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });

    return tx.contractTemplate.create({
      data: {
        name: 'Кўчмас мулк олди-сотдисини ташкил этиш бўйича уч томонлама шартнома',
        serviceType: 'SALE_PURCHASE',
        version: (latest?.version || 0) + 1,
        htmlBody: salePurchaseContractHtml(),
        isActive: true,
      },
    });
  }

  if (caseItem.serviceType === 'INVESTOR_PARTNERSHIP') {
    const marker = 'data-gk-template="investor-partnership-v1"';

    const current = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'INVESTOR_PARTNERSHIP',
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (current?.htmlBody?.includes(marker)) {
      return current;
    }

    const latest = await tx.contractTemplate.findFirst({
      where: {
        serviceType: 'INVESTOR_PARTNERSHIP',
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });

    return tx.contractTemplate.create({
      data: {
        name: 'Инвестор билан ҳамкорлик қилиш тўғрисида шартнома',
        serviceType: 'INVESTOR_PARTNERSHIP',
        version: (latest?.version || 0) + 1,
        htmlBody: investorPartnershipContractHtml(),
        isActive: true,
      },
    });
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


/**
 * GET /api/contracts
 *
 * Барча шартномалар рўйхати:
 * - pagination
 * - шартнома ID / мурожаат ID / мижоз Ф.И.Ш. / телефон бўйича қидирув
 * - ҳолат бўйича фильтр
 * - филиал ва мижоз маълумотлари
 * - PDF учун вақтинчалик signed URL
 */
router.get(
  '/',
  allowRoles(...MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
      );

      const search = String(req.query.search || '').trim();
      const status = String(req.query.status || '').trim();

      const allowedStatuses = [
        'DRAFT',
        'MANAGER_REVIEW',
        'READY_TO_SIGN',
        'SIGNED',
        'CANCELLED',
        'ARCHIVED',
      ];

      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Шартнома ҳолати нотўғри',
        });
      }

      const where = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          {
            displayId: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            case: {
              is: {
                displayId: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            case: {
              is: {
                applicant: {
                  is: {
                    fullName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          },
          {
            case: {
              is: {
                applicant: {
                  is: {
                    phone: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          },
        ];
      }

      // Филиал даражасидаги роллар фақат ўз филиали шартномаларини кўради.
      if (
        ['BRANCH_MANAGER', 'RECEPTION_MANAGER'].includes(req.user.role) &&
        req.user.branchId
      ) {
        where.case = {
          ...(where.case || {}),
          is: {
            ...(where.case?.is || {}),
            branchId: req.user.branchId,
          },
        };
      }

      // Қабул менежери учун — фақат ўзига бириктирилган мурожаатлар.
      if (req.user.role === 'RECEPTION_MANAGER') {
        where.case = {
          ...(where.case || {}),
          is: {
            ...(where.case?.is || {}),
            receptionManagerId: req.user.id,
          },
        };
      }

      const [items, total] = await Promise.all([
        prisma.contract.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                displayId: true,
                serviceType: true,
                branchId: true,
                receptionManagerId: true,
                applicant: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                  },
                },
                branch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            template: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.contract.count({
          where,
        }),
      ]);

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
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * DELETE /api/contracts/:contractId
 *
 * Тест ёки нотўғри яратилган шартномани тўлиқ ўчириш.
 * Фақат SUPER_ADMIN ва DIRECTOR.
 *
 * - Contract'га боғланган Invitation'лар аввал ўчирилади
 * - QR экранда шу шартнома очиқ бўлса, экран IDLE ҳолатига қайтарилади
 * - Contract базадан ўчирилади
 * - PDF Supabase Storage'дан best-effort тарзда ўчирилади
 * - AuditLog'да ўчириш қайди қолади
 */
router.delete(
  '/:contractId',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const contract = await prisma.contract.findUnique({
        where: {
          id: req.params.contractId,
        },
        select: {
          id: true,
          displayId: true,
          caseId: true,
          status: true,
          pdfUrl: true,
        },
      });

      if (!contract) {
        return res.status(404).json({
          error: 'Шартнома топилмади',
        });
      }

      const storagePath =
        contract.pdfUrl &&
        !/^https?:\/\//i.test(contract.pdfUrl)
          ? contract.pdfUrl
          : null;

      await prisma.$transaction(async (tx) => {
        // KioskDevice.currentContractId schema'да relation эмас,
        // шунинг учун ўчиришдан олдин қўлда тозалаймиз.
        await tx.kioskDevice.updateMany({
          where: {
            currentContractId: contract.id,
          },
          data: {
            currentContractId: null,
            currentQrDataUrl: null,
            currentSignUrl: null,
            qrExpiresAt: null,
            displayStatus: 'IDLE',
          },
        });

        // Invitation.contract relation'да onDelete: Cascade йўқ.
        await tx.invitation.deleteMany({
          where: {
            contractId: contract.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Contract',
            entityId: contract.id,
            action: 'CONTRACT_DELETED',
            metadata: {
              displayId: contract.displayId,
              caseId: contract.caseId,
              previousStatus: contract.status,
              pdfStoragePath: storagePath,
              deletedAt: new Date().toISOString(),
            },
          },
        });

        await tx.contract.delete({
          where: {
            id: contract.id,
          },
        });
      });

      let storageDeleted = false;
      let storageWarning = null;

      if (storagePath) {
        try {
          await deleteStorageFile(storagePath);
          storageDeleted = true;
        } catch (storageError) {
          storageWarning =
            storageError?.message ||
            'PDF файлни Storage дан ўчиришда хатолик юз берди';
        }
      }

      return res.json({
        message: `${contract.displayId} шартномаси ўчирилди`,
        deletedId: contract.id,
        displayId: contract.displayId,
        storageDeleted,
        storageWarning,
      });
    } catch (error) {
      next(error);
    }
  }
);

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
            select: {
              id: true,
              signerRole: true,
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

      if (
        caseItem.serviceType === 'REALTOR_SERVICE' &&
        !(Number(parsed.data.serviceFee || caseItem.serviceFee) > 0)
      ) {
        return res.status(400).json({
          error: 'Риэлторлик шартномаси учун хизмат ҳақини киритинг',
        });
      }

      if (
        caseItem.serviceType === 'SALE_PURCHASE' &&
        !(Number(caseItem.requestedAmount) > 0)
      ) {
        return res.status(400).json({
          error: 'Олди-сотди шартномаси учун битим нархини киритинг',
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

        if (
          caseItem.serviceType === 'REALTOR_SERVICE' &&
          Number(parsed.data.serviceFee) > 0
        ) {
          await tx.case.update({
            where: {
              id: caseItem.id,
            },
            data: {
              serviceFee: parsed.data.serviceFee,
            },
          });
        }

        const displayId = await generateContractDisplayId(
          tx,
          caseItem.serviceType
        );

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
              serviceType: true,
            },
          },
        },
      });

      if (!contract) {
        return res.status(404).json({
          error: 'Шартнома топилмади',
        });
      }

      const signerRole =
        contract.case?.serviceType === 'SALE_PURCHASE'
          ? parsed.data.signerRole
          : 'CLIENT';

      if (
        contract.case?.serviceType === 'SALE_PURCHASE' &&
        !['SELLER', 'BUYER'].includes(signerRole)
      ) {
        return res.status(400).json({
          error:
            'Олди-сотди шартномаси учун Сотувчи ёки Харидор QR турини танланг',
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
            signerRole,
            usedAt: null,
          },
        });

        await tx.invitation.create({
          data: {
            tokenHash,
            signerRole,
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
              signerRole,
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

      let kiosk = null;

      if (parsed.data.kioskId) {
        kiosk = await prisma.kioskDevice.findUnique({
          where: {
            id: parsed.data.kioskId,
          },
        });

        if (!kiosk) {
          return res.status(404).json({
            error: 'QR экран қурилмаси топилмади',
          });
        }

        if (
          req.user.role !== 'SUPER_ADMIN' &&
          req.user.role !== 'DIRECTOR' &&
          req.user.branchId &&
          kiosk.branchId !== req.user.branchId
        ) {
          return res.status(403).json({
            error: 'Бошқа филиал QR экранига юбориш мумкин эмас',
          });
        }

        await prisma.kioskDevice.update({
          where: {
            id: kiosk.id,
          },
          data: {
            currentContractId: contract.id,
            currentQrDataUrl: qrDataUrl,
            currentSignUrl: signUrl,
            qrExpiresAt: expiresAt,
            displayStatus: 'QR_READY',
          },
        });
      }

      return res.json({
        message: 'Бир марталик QR-код яратилди',
        contractId: contract.id,
        contractDisplayId: contract.displayId,
        expiresAt,
        signerRole,
        signerLabel:
          signerRole === 'SELLER'
            ? 'Сотувчи'
            : signerRole === 'BUYER'
              ? 'Харидор'
              : 'Мижоз',
        signUrl,
        qrDataUrl,
        kiosk: kiosk
          ? {
              id: kiosk.id,
              name: kiosk.name,
              deviceCode: kiosk.deviceCode,
            }
          : null,
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
