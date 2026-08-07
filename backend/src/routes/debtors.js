import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

const DEBTOR_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'ACCOUNTANT',
];

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().trim().max(120).optional().or(z.literal('')),
  reference: z.string().trim().max(250).optional().or(z.literal('')),
  paidAt: z.string().trim().optional().or(z.literal('')),
});

function clean(value) {
  if (typeof value !== 'string') return value ?? null;
  const normalized = value.trim();
  return normalized || null;
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getPaidAmount(payments = []) {
  return payments
    .filter((payment) =>
      ['PAID', 'PARTIAL'].includes(payment.status)
    )
    .reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    );
}

function getBranchScope(req) {
  if (
    req.user.role === 'BRANCH_MANAGER' &&
    req.user.branchId
  ) {
    return req.user.branchId;
  }

  if (
    req.user.role === 'RECEPTION_MANAGER' &&
    req.user.branchId
  ) {
    return req.user.branchId;
  }

  return null;
}

router.use(auth);
router.use(allowRoles(...DEBTOR_ROLES));

/**
 * GET /api/debtors
 *
 * Қарздор — мижоз маблағни олган/иш якунланган,
 * хизмат ҳақи мавжуд ва тўлиқ тўланмаган мурожаат.
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const requestedBranchId =
      typeof req.query.branchId === 'string'
        ? req.query.branchId.trim()
        : '';

    const serviceType =
      typeof req.query.serviceType === 'string'
        ? req.query.serviceType.trim()
        : '';

    const fixedBranchId = getBranchScope(req);
    const branchId = fixedBranchId || requestedBranchId || '';

    const where = {
      serviceFee: {
        not: null,
      },
      status: {
        in: [
          'CLIENT_RECEIVED_FUNDS',
          'SERVICE_FEE_PAID',
          'COMPLETED',
        ],
      },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (serviceType) {
      where.serviceType = serviceType;
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
          applicant: {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          applicant: {
            phone: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          applicant: {
            pinfl: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const sourceItems = await prisma.case.findMany({
      where,
      select: {
        id: true,
        displayId: true,
        serviceType: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        serviceFee: true,
        bankName: true,
        clientReceivedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        applicant: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            pinfl: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        executor: {
          select: {
            id: true,
            fullName: true,
          },
        },
        receptionManager: {
          select: {
            id: true,
            fullName: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            reference: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        {
          clientReceivedAt: 'asc',
        },
        {
          updatedAt: 'asc',
        },
      ],
    });

    const debtorItems = sourceItems
      .map((item) => {
        const serviceFee = toNumber(item.serviceFee);
        const paidAmount = getPaidAmount(item.payments);
        const remainingAmount = Math.max(
          serviceFee - paidAmount,
          0
        );

        return {
          ...item,
          serviceFee,
          paidAmount,
          remainingAmount,
        };
      })
      .filter(
        (item) =>
          item.serviceFee > 0 &&
          item.remainingAmount > 0
      );

    const totalDebt = debtorItems.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );

    const totalServiceFee = debtorItems.reduce(
      (sum, item) => sum + item.serviceFee,
      0
    );

    const totalPaid = debtorItems.reduce(
      (sum, item) => sum + item.paidAmount,
      0
    );

    const start = (page - 1) * limit;
    const items = debtorItems.slice(start, start + limit);

    const branches = await prisma.branch.findMany({
      where: fixedBranchId
        ? {
            id: fixedBranchId,
          }
        : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json({
      items,
      summary: {
        debtorsCount: debtorItems.length,
        totalServiceFee,
        totalPaid,
        totalDebt,
      },
      branches,
      pagination: {
        page,
        limit,
        total: debtorItems.length,
        totalPages: Math.max(
          Math.ceil(debtorItems.length / limit),
          1
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/debtors/:caseId/payment
 *
 * Қисман тўловда мурожаат Қарздорларда қолади.
 * Қолдиқ 0 бўлганда мурожаат автоматик ARCHIVED бўлади.
 */
router.post(
  '/:caseId/payment',
  async (req, res, next) => {
    try {
      const parsed = paymentSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Тўлов маълумотларида хато бор',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const item = await prisma.case.findUnique({
        where: {
          id: req.params.caseId,
        },
        include: {
          payments: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const fixedBranchId = getBranchScope(req);

      if (
        fixedBranchId &&
        item.branchId !== fixedBranchId
      ) {
        return res.status(403).json({
          error: 'Бошқа филиал қарздорининг тўловини кирита олмайсиз',
        });
      }

      if (item.status === 'ARCHIVED') {
        return res.status(409).json({
          error: 'Мурожаат аллақачон архивланган',
        });
      }

      const serviceFee = toNumber(item.serviceFee);
      const paidBefore = getPaidAmount(item.payments);
      const remainingBefore = Math.max(
        serviceFee - paidBefore,
        0
      );

      if (serviceFee <= 0) {
        return res.status(409).json({
          error: 'Ушбу мурожаатда хизмат ҳақи белгиланмаган',
        });
      }

      if (remainingBefore <= 0) {
        return res.status(409).json({
          error: 'Хизмат ҳақи аллақачон тўлиқ тўланган',
        });
      }

      if (parsed.data.amount > remainingBefore) {
        return res.status(400).json({
          error: `Тўлов қолдиқдан катта. Қолдиқ: ${remainingBefore}`,
        });
      }

      const paidAt = parsed.data.paidAt
        ? new Date(parsed.data.paidAt)
        : new Date();

      if (Number.isNaN(paidAt.getTime())) {
        return res.status(400).json({
          error: 'Тўлов санаси нотўғри',
        });
      }

      const remainingAfter = Math.max(
        remainingBefore - parsed.data.amount,
        0
      );

      const result = await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.create({
            data: {
              caseId: item.id,
              amount: parsed.data.amount,
              status:
                remainingAfter <= 0
                  ? 'PAID'
                  : 'PARTIAL',
              method: clean(parsed.data.method),
              reference: clean(parsed.data.reference),
              paidAt,
            },
          });

          let caseItem = item;

          if (remainingAfter <= 0) {
            caseItem = await tx.case.update({
              where: {
                id: item.id,
              },
              data: {
                status: 'ARCHIVED',
                completedAt:
                  item.completedAt || new Date(),
                nextAction:
                  'Хизмат ҳақи тўлиқ тўланди. Мурожаат архивга ўтказилди',
              },
            });

            await tx.caseHistory.create({
              data: {
                caseId: item.id,
                fromStatus: item.status,
                toStatus: 'ARCHIVED',
                note:
                  'Қарз тўлиқ ёпилди ва мурожаат архивга ўтказилди',
              },
            });

            await tx.auditLog.create({
              data: {
                userId: req.user.id,
                entityType: 'Case',
                entityId: item.id,
                action: 'DEBT_PAID_AND_ARCHIVED',
                metadata: {
                  paymentId: payment.id,
                  amount: parsed.data.amount,
                  paidBefore,
                  totalServiceFee: serviceFee,
                },
              },
            });
          } else {
            await tx.auditLog.create({
              data: {
                userId: req.user.id,
                entityType: 'Case',
                entityId: item.id,
                action: 'DEBT_PARTIAL_PAYMENT',
                metadata: {
                  paymentId: payment.id,
                  amount: parsed.data.amount,
                  remainingAfter,
                },
              },
            });
          }

          return {
            payment,
            case: caseItem,
          };
        }
      );

      return res.status(201).json({
        message:
          remainingAfter <= 0
            ? 'Қарз тўлиқ ёпилди ва мурожаат архивга ўтказилди'
            : 'Қисман тўлов сақланди',
        item: result,
        totals: {
          serviceFee,
          paidAmount:
            paidBefore + parsed.data.amount,
          remainingAmount: remainingAfter,
        },
        archived: remainingAfter <= 0,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
