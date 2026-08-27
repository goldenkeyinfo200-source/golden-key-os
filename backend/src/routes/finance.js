import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import { createPaymentReceiptPdf, makeReceiptNumber } from '../services/payment-receipt.js';
import { sendPaymentReceiptToClient } from '../services/telegram.js';

const router = Router();

const FINANCE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'ACCOUNTANT',
];

const paymentSchema = z.object({
  caseId: z.string().trim().min(1),
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
  if (value === null || value === undefined || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateRangeWhere(from, to) {
  const result = {};

  if (from) {
    const start = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) result.gte = start;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(end.getTime())) result.lte = end;
  }

  return Object.keys(result).length ? result : undefined;
}

function branchScope(req) {
  if (req.user.role === 'SUPER_ADMIN') {
    return null;
  }

  return req.user.branchId || '__NO_BRANCH__';
}

router.use(auth);
router.use(allowRoles(...FINANCE_ROLES));

/**
 * GET /api/finance
 *
 * Query:
 * search
 * branchId
 * status = paid | partial | unpaid
 * from = YYYY-MM-DD
 * to = YYYY-MM-DD
 * page
 * limit
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

    const paymentState =
      typeof req.query.status === 'string'
        ? req.query.status.trim()
        : '';

    const from =
      typeof req.query.from === 'string'
        ? req.query.from.trim()
        : '';

    const to =
      typeof req.query.to === 'string'
        ? req.query.to.trim()
        : '';

    const fixedBranchId = branchScope(req);

    if (fixedBranchId === '__NO_BRANCH__') {
      return res.status(403).json({
        error:
          'Сизга филиал бириктирилмаган. Молиявий ҳисоботларни кўриш учун администратор филиал бириктириши керак.',
      });
    }

    const branchId =
      req.user.role === 'SUPER_ADMIN'
        ? requestedBranchId || ''
        : fixedBranchId;

    const caseWhere = {
      serviceFee: {
        not: null,
      },
      status: {
        notIn: ['REJECTED', 'CANCELLED', 'ARCHIVED'],
      },
    };

    if (branchId) {
      caseWhere.branchId = branchId;
    }

    if (search) {
      caseWhere.OR = [
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
      ];
    }

    const createdRange = dateRangeWhere(from, to);
    if (createdRange) {
      caseWhere.createdAt = createdRange;
    }

    const allCases = await prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        displayId: true,
        serviceType: true,
        status: true,
        approvedAmount: true,
        serviceFeePercent: true,
        serviceFeeAutoAmount: true,
        serviceFee: true,
        bankName: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        applicant: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            paidAt: true,
            reference: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const rows = allCases.map((item) => {
      const fee = toNumber(item.serviceFee);

      const paidAmount = item.payments
        .filter((payment) =>
          ['PAID', 'PARTIAL'].includes(payment.status)
        )
        .reduce(
          (sum, payment) => sum + toNumber(payment.amount),
          0
        );

      const remainingAmount = Math.max(fee - paidAmount, 0);

      let financeStatus = 'UNPAID';

      if (fee > 0 && paidAmount >= fee) {
        financeStatus = 'PAID';
      } else if (paidAmount > 0) {
        financeStatus = 'PARTIAL';
      }

      return {
        ...item,
        paidAmount,
        remainingAmount,
        financeStatus,
      };
    });

    const filteredRows = paymentState
      ? rows.filter(
          (row) =>
            row.financeStatus.toLowerCase() ===
            paymentState.toLowerCase()
        )
      : rows;

    const totalDue = filteredRows.reduce(
      (sum, item) => sum + toNumber(item.serviceFee),
      0
    );

    const totalPaid = filteredRows.reduce(
      (sum, item) => sum + item.paidAmount,
      0
    );

    const totalRemaining = filteredRows.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );

    const paidCount = filteredRows.filter(
      (item) => item.financeStatus === 'PAID'
    ).length;

    const partialCount = filteredRows.filter(
      (item) => item.financeStatus === 'PARTIAL'
    ).length;

    const unpaidCount = filteredRows.filter(
      (item) => item.financeStatus === 'UNPAID'
    ).length;

    const start = (page - 1) * limit;
    const items = filteredRows.slice(start, start + limit);

    const branches = await prisma.branch.findMany({
      where:
        req.user.role === 'SUPER_ADMIN'
          ? undefined
          : {
              id: fixedBranchId,
            },
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
        totalDue,
        totalPaid,
        totalRemaining,
        casesCount: filteredRows.length,
        paidCount,
        partialCount,
        unpaidCount,
      },
      branches,
      pagination: {
        page,
        limit,
        total: filteredRows.length,
        totalPages: Math.max(
          Math.ceil(filteredRows.length / limit),
          1
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/finance/payments
 * Actual received service-fee payment.
 */
router.post('/payments', async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Тўлов маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    const caseItem = await prisma.case.findUnique({
      where: {
        id: data.caseId,
      },
      include: {
        applicant: {
          select: {
            fullName: true,
            phone: true,
            telegramId: true,
          },
        },
        branch: {
          select: {
            name: true,
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!caseItem) {
      return res.status(404).json({
        error: 'Мурожаат топилмади',
      });
    }

    if (['REJECTED', 'CANCELLED', 'ARCHIVED'].includes(caseItem.status)) {
      return res.status(409).json({
        error: 'Рад этилган, бекор қилинган ёки архивланган мурожаатга тўлов киритиб бўлмайди',
      });
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      if (!req.user.branchId) {
        return res.status(403).json({
          error:
            'Сизга филиал бириктирилмаган. Тўлов киритиш учун администратор филиал бириктириши керак.',
        });
      }

      if (caseItem.branchId !== req.user.branchId) {
        return res.status(403).json({
          error: 'Бошқа филиал мурожаатига тўлов кирита олмайсиз',
        });
      }
    }

    const serviceFee = toNumber(caseItem.serviceFee);

    if (serviceFee <= 0) {
      return res.status(409).json({
        error: 'Ушбу мурожаатда хизмат ҳақи белгиланмаган',
      });
    }

    const alreadyPaid = caseItem.payments
      .filter((payment) =>
        ['PAID', 'PARTIAL'].includes(payment.status)
      )
      .reduce(
        (sum, payment) => sum + toNumber(payment.amount),
        0
      );

    if (alreadyPaid >= serviceFee) {
      return res.status(409).json({
        error: 'Хизмат ҳақи аллақачон тўлиқ тўланган',
      });
    }

    const remainingBefore = Math.max(
      serviceFee - alreadyPaid,
      0
    );

    if (data.amount > remainingBefore) {
      return res.status(400).json({
        error: `Киритилган сумма қолдиқдан катта. Қолдиқ: ${remainingBefore}`,
      });
    }

    const paidAt = data.paidAt
      ? new Date(data.paidAt)
      : new Date();

    if (Number.isNaN(paidAt.getTime())) {
      return res.status(400).json({
        error: 'Тўлов санаси нотўғри',
      });
    }

    const remainingAfter = Math.max(
      serviceFee - alreadyPaid - data.amount,
      0
    );

    const payment = await prisma.$transaction(
      async (tx) => {
        const created = await tx.payment.create({
          data: {
            caseId: caseItem.id,
            amount: data.amount,
            status:
              remainingAfter <= 0 ? 'PAID' : 'PARTIAL',
            method: clean(data.method),
            reference: clean(data.reference),
            paidAt,
          },
        });

        if (
          remainingAfter <= 0 &&
          caseItem.status === 'CLIENT_RECEIVED_FUNDS'
        ) {
          await tx.case.update({
            where: {
              id: caseItem.id,
            },
            data: {
              status: 'SERVICE_FEE_PAID',
            },
          });

          await tx.caseHistory.create({
            data: {
              caseId: caseItem.id,
              fromStatus: 'CLIENT_RECEIVED_FUNDS',
              toStatus: 'SERVICE_FEE_PAID',
              note: 'Хизмат ҳақи тўлиқ тўланди',
            },
          });
        }

        return created;
      }
    );

    const paidAfter = alreadyPaid + data.amount;
    const receiptNumber = makeReceiptNumber(payment);

    let receipt = {
      sent: false,
      skipped: true,
      reason: 'Квитанция юборилмади',
    };

    try {
      const pdfBuffer = await createPaymentReceiptPdf({
        payment,
        caseItem,
        paidBefore: alreadyPaid,
        paidAfter,
        remainingAfter,
        operatorName:
          req.user.fullName || req.user.login || null,
      });

      receipt = await sendPaymentReceiptToClient({
        telegramId:
          caseItem.applicant?.telegramId,
        pdfBuffer,
        fileName: `${receiptNumber}.pdf`,
        receiptNumber,
        caseDisplayId: caseItem.displayId,
        paidAmount: data.amount,
        remainingAmount: remainingAfter,
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          entityType: 'Payment',
          entityId: payment.id,
          action: receipt.sent
            ? 'PAYMENT_RECEIPT_SENT'
            : 'PAYMENT_RECEIPT_SKIPPED',
          metadata: {
            receiptNumber,
            reason: receipt.reason || null,
          },
        },
      });
    } catch (receiptError) {
      console.error(
        'Payment receipt error:',
        receiptError
      );

      receipt = {
        sent: false,
        skipped: false,
        error: receiptError.message,
      };

      await prisma.auditLog
        .create({
          data: {
            userId: req.user.id,
            entityType: 'Payment',
            entityId: payment.id,
            action: 'PAYMENT_RECEIPT_FAILED',
            metadata: {
              receiptNumber,
              error: receiptError.message,
            },
          },
        })
        .catch(() => {});
    }

    return res.status(201).json({
      item: payment,
      receiptNumber,
      receipt,
      totals: {
        serviceFee,
        paidAmount: paidAfter,
        remainingAmount: remainingAfter,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
