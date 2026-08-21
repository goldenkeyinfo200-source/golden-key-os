import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import {
  notifyNewCase,
  notifyCaseStatusChanged,
} from '../services/notify.js';

const router = Router();

const CREATE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

const VIEW_ALL_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'ACCOUNTANT',
  'LAWYER',
];

const serviceTypes = [
  'PRIMARY_MORTGAGE',
  'SECONDARY_MORTGAGE',
  'MICROLOAN',
  'REALTOR_SERVICE',
  'SALE_PURCHASE',
  'CADASTRE_SERVICE',
  'INVESTOR_PARTNERSHIP',
  'OTHER',
];

const caseStatuses = [
  'NEW',
  'DATA_COLLECTION',
  'BANK_REVIEW',
  'CLIENT_PREAPPROVED',
  'OFFICE_VISIT',
  'CONTRACT_PENDING',
  'CONTRACT_SIGNED',
  'ASSIGNED_TO_EXECUTOR',
  'IN_EXECUTION',
  'PROPERTY_MONITORING',
  'CREDIT_APPROVED',
  'CREDIT_ISSUED',
  'CLIENT_RECEIVED_FUNDS',
  'SERVICE_FEE_PAID',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'ARCHIVED',
];

const createCaseSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Ф.И.Ш. камида 3 та белгидан иборат бўлиши керак')
    .max(200, 'Ф.И.Ш. жуда узун'),

  phone: z
    .string()
    .trim()
    .min(7, 'Телефон рақами нотўғри')
    .max(30, 'Телефон рақами жуда узун'),

  pinfl: z
    .string()
    .trim()
    .regex(/^\d{14}$/, 'ЖШШИР 14 та рақамдан иборат бўлиши керак')
    .optional()
    .or(z.literal('')),

  passportSeries: z
    .string()
    .trim()
    .max(10, 'Паспорт серияси жуда узун')
    .optional()
    .or(z.literal('')),

  passportNumber: z
    .string()
    .trim()
    .max(20, 'Паспорт рақами жуда узун')
    .optional()
    .or(z.literal('')),

  birthDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .trim()
    .max(500, 'Манзил жуда узун')
    .optional()
    .or(z.literal('')),

  serviceType: z.enum(serviceTypes),

  requestedAmount: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  serviceFee: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  sellerFullName: z.string().trim().max(200).optional().or(z.literal('')),
  sellerPhone: z.string().trim().max(30).optional().or(z.literal('')),
  sellerPinfl: z.string().trim().regex(/^\d{14}$/, 'Сотувчи ЖШШИРи 14 та рақам бўлиши керак').optional().or(z.literal('')),
  sellerPassportSeries: z.string().trim().max(10).optional().or(z.literal('')),
  sellerPassportNumber: z.string().trim().max(20).optional().or(z.literal('')),
  sellerAddress: z.string().trim().max(500).optional().or(z.literal('')),
  salePropertyType: z.string().trim().max(50).optional().or(z.literal('')),
  salePropertyAddress: z.string().trim().max(500).optional().or(z.literal('')),
  saleCadastreNumber: z.string().trim().max(100).optional().or(z.literal('')),
  salePropertyArea: z.union([z.number(), z.string()]).optional().nullable(),
  saleServiceFeePayer: z.enum(['BUYER', 'SELLER', 'BOTH']).optional().nullable(),
  saleDepositAmount: z.union([z.number(), z.string()]).optional().nullable(),
  saleDepositPaidAt: z.string().trim().optional().or(z.literal('')),
  saleDepositDeadline: z.string().trim().optional().or(z.literal('')),

  investorAmount: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  investorProfitSharePercent: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  investorContractStartDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),

  investorContractEndDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),

  investorNotes: z
    .string()
    .trim()
    .max(2000, 'Инвестор изоҳи жуда узун')
    .optional()
    .or(z.literal('')),

  bankName: z
    .string()
    .trim()
    .max(200, 'Банк номи жуда узун')
    .optional()
    .or(z.literal('')),

  nextAction: z
    .string()
    .trim()
    .max(500, 'Кейинги ҳаракат матни жуда узун')
    .optional()
    .or(z.literal('')),

  branchId: z
    .string()
    .trim()
    .optional()
    .nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(caseStatuses),

  note: z
    .string()
    .trim()
    .max(1000, 'Изоҳ жуда узун')
    .optional()
    .or(z.literal('')),
});



const updateParticipantsSchema = z.object({
  borrowerSameAsApplicant: z.boolean().optional().default(true),

  borrower: z
    .object({
      fullName: z.string().trim().min(3).max(200),
      phone: z.string().trim().max(30).optional().or(z.literal('')),
      pinfl: z
        .string()
        .trim()
        .regex(/^\d{14}$/, 'Қарз олувчи ЖШШИРи 14 та рақам бўлиши керак')
        .optional()
        .or(z.literal('')),
      passportSeries: z.string().trim().max(10).optional().or(z.literal('')),
      passportNumber: z.string().trim().max(20).optional().or(z.literal('')),
      birthDate: z.string().trim().optional().or(z.literal('')),
      address: z.string().trim().max(500).optional().or(z.literal('')),
    })
    .optional()
    .nullable(),

  collateralOwnerSameAsBorrower: z.boolean().optional().default(true),

  collateralOwner: z
    .object({
      fullName: z.string().trim().min(3).max(200),
      phone: z.string().trim().max(30).optional().or(z.literal('')),
      pinfl: z
        .string()
        .trim()
        .regex(/^\d{14}$/, 'Гаров эгаси ЖШШИРи 14 та рақам бўлиши керак')
        .optional()
        .or(z.literal('')),
      passportSeries: z.string().trim().max(10).optional().or(z.literal('')),
      passportNumber: z.string().trim().max(20).optional().or(z.literal('')),
      address: z.string().trim().max(500).optional().or(z.literal('')),
    })
    .optional()
    .nullable(),
});

const updateFinanceCollateralSchema = z.object({
  approvedAmount: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  serviceFeePercent: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  serviceFeeOverride: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  collateralType: z
    .string()
    .trim()
    .max(100, 'Гаров тури жуда узун')
    .optional()
    .or(z.literal('')),

  collateralAddress: z
    .string()
    .trim()
    .max(500, 'Гаров манзили жуда узун')
    .optional()
    .or(z.literal('')),

  collateralCadastreNumber: z
    .string()
    .trim()
    .max(100, 'Кадастр рақами жуда узун')
    .optional()
    .or(z.literal('')),

  collateralOwnerFullName: z
    .string()
    .trim()
    .max(200, 'Мулкдор Ф.И.Ш. жуда узун')
    .optional()
    .or(z.literal('')),

  collateralOwnerPinfl: z
    .string()
    .trim()
    .max(20, 'Мулкдор ЖШШИРи жуда узун')
    .optional()
    .or(z.literal('')),

  collateralArea: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  collateralEstimatedValue: z
    .union([z.number(), z.string()])
    .optional()
    .nullable(),

  collateralNotes: z
    .string()
    .trim()
    .max(1500, 'Гаров изоҳи жуда узун')
    .optional()
    .or(z.literal('')),
});

const assignExecutorSchema = z.object({
  executorId: z.string().trim().min(1, 'Ижрочи танланмаган'),
});

const normalizeOptional = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const parseAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized =
    typeof value === 'string'
      ? value.replace(/\s/g, '').replace(/,/g, '.')
      : value;

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return amount;
};


const calculateServiceFee = ({
  approvedAmount,
  percent,
  overrideAmount,
}) => {
  const safePercent =
    Number.isFinite(percent) && percent >= 0
      ? percent
      : 4.5;

  const autoAmount =
    Number.isFinite(approvedAmount) && approvedAmount >= 0
      ? Math.round((approvedAmount * safePercent) / 100)
      : null;

  const finalAmount =
    Number.isFinite(overrideAmount) && overrideAmount >= 0
      ? overrideAmount
      : autoAmount;

  return {
    percent: safePercent,
    autoAmount,
    finalAmount,
  };
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const generateCaseDisplayId = async (tx, serviceType) => {
  const year = new Date().getFullYear();

  const servicePrefix = {
    REALTOR_SERVICE: 'GK-RM',
    SALE_PURCHASE: 'GK-OS',
    CADASTRE_SERVICE: 'GK-KD',
    INVESTOR_PARTNERSHIP: 'GK-IN',
    OTHER: 'GK-BS',
  };

  const prefix = `${servicePrefix[serviceType] || 'GK-IP'}-${year}-`;

  const latestCase = await tx.case.findFirst({
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

  const latestNumber = latestCase?.displayId
    ? Number(latestCase.displayId.split('-').at(-1))
    : 0;

  const nextNumber = Number.isFinite(latestNumber)
    ? latestNumber + 1
    : 1;

  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
};

const caseInclude = {
  applicant: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      pinfl: true,
      passportSeries: true,
      passportNumber: true,
      birthDate: true,
      address: true,
    },
  },

  branch: {
    select: {
      id: true,
      name: true,
      city: true,
    },
  },

  receptionManager: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },

  executor: {
    select: {
      id: true,
      fullName: true,
      role: true,
    },
  },

  borrowers: {
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          pinfl: true,
          passportSeries: true,
          passportNumber: true,
        },
      },
    },
    orderBy: {
      sequence: 'asc',
    },
  },

  contracts: {
    select: {
      id: true,
      displayId: true,
      status: true,
      pdfUrl: true,
      signedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
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

  history: {
    orderBy: {
      createdAt: 'desc',
    },
  },
};

/**
 * Барча /api/cases роутлари авторизация талаб қилади.
 */
router.use(auth);

/**
 * GET /api/cases/stats
 * Dashboard учун статистика.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const where = {};

    if (
      req.user.role === 'RECEPTION_MANAGER'
    ) {
      where.receptionManagerId = req.user.id;
    }

    if (req.user.role === 'EXECUTOR') {
      where.executorId = req.user.id;
    }

    if (
      req.user.role === 'BRANCH_MANAGER' &&
      req.user.branchId
    ) {
      where.branchId = req.user.branchId;
    }

    if (req.user.role === 'BANK_EMPLOYEE') {
      where.status = {
        in: ['BANK_REVIEW', 'CLIENT_PREAPPROVED'],
      };
    }

    const [
      total,
      newCases,
      bankReview,
      inExecution,
      completed,
      rejected,
    ] = await Promise.all([
      prisma.case.count({ where }),

      prisma.case.count({
        where: {
          ...where,
          status: 'NEW',
        },
      }),

      prisma.case.count({
        where: {
          ...where,
          status: 'BANK_REVIEW',
        },
      }),

      prisma.case.count({
        where: {
          ...where,
          status: {
            in: [
              'ASSIGNED_TO_EXECUTOR',
              'IN_EXECUTION',
              'PROPERTY_MONITORING',
              'CREDIT_APPROVED',
              'CREDIT_ISSUED',
              'CLIENT_RECEIVED_FUNDS',
              'SERVICE_FEE_PAID',
            ],
          },
        },
      }),

      prisma.case.count({
        where: {
          ...where,
          status: 'COMPLETED',
        },
      }),

      prisma.case.count({
        where: {
          ...where,
          status: 'REJECTED',
        },
      }),
    ]);

    return res.json({
      stats: {
        total,
        new: newCases,
        bankReview,
        inExecution,
        completed,
        rejected,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cases
 *
 * Query:
 * search
 * status
 * serviceType
 * scope=execution
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

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim()
        : '';

    const serviceType =
      typeof req.query.serviceType === 'string'
        ? req.query.serviceType.trim()
        : '';

    const scope =
      typeof req.query.scope === 'string'
        ? req.query.scope.trim()
        : '';

    const where = {};

    if (scope === 'archive') {
      // Архив бўлими: архивланган ва бекор қилинган ишлар.
      where.status = {
        in: ['ARCHIVED', 'CANCELLED'],
      };

      if (
        status &&
        ['ARCHIVED', 'CANCELLED'].includes(status)
      ) {
        where.status = status;
      }
    } else if (scope === 'execution') {
      where.status = {
        in: [
          'ASSIGNED_TO_EXECUTOR',
          'IN_EXECUTION',
          'PROPERTY_MONITORING',
          'CREDIT_APPROVED',
          'CREDIT_ISSUED',
          'CLIENT_RECEIVED_FUNDS',
          'SERVICE_FEE_PAID',
        ],
      };

      if (
        status &&
        caseStatuses.includes(status) &&
        !['ARCHIVED', 'CANCELLED'].includes(status)
      ) {
        where.status = status;
      }
    } else {
      // Асосий «Мурожаатлар» рўйхати.
      // Архивланган ва бекор қилинган ишлар бу ерда чиқмайди.
      where.status = {
        notIn: ['ARCHIVED', 'CANCELLED'],
      };

      if (
        status &&
        caseStatuses.includes(status) &&
        !['ARCHIVED', 'CANCELLED'].includes(status)
      ) {
        where.status = status;
      }
    }

    if (
      serviceType &&
      serviceTypes.includes(serviceType)
    ) {
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
        {
          applicant: {
            passportNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (
      req.user.role === 'RECEPTION_MANAGER'
    ) {
      where.receptionManagerId = req.user.id;
    }

    if (req.user.role === 'EXECUTOR') {
      where.executorId = req.user.id;
    }

    if (
      req.user.role === 'BRANCH_MANAGER' &&
      req.user.branchId
    ) {
      where.branchId = req.user.branchId;
    }

    if (req.user.role === 'BANK_EMPLOYEE') {
      if (!req.user.bankId) {
        where.id = '__NO_BANK_ASSIGNED__';
      } else {
        where.bankAssignments = {
          some: {
            bankId: req.user.bankId,
            status: {
              notIn: ['CLOSED'],
            },
          },
        };
      }
    }

    const [items, total] = await prisma.$transaction([
      prisma.case.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          applicant: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              pinfl: true,
              passportSeries: true,
              passportNumber: true,
            },
          },

          branch: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },

          receptionManager: {
            select: {
              id: true,
              fullName: true,
            },
          },

          executor: {
            select: {
              id: true,
              fullName: true,
            },
          },

          _count: {
            select: {
              borrowers: true,
              contracts: true,
              documents: true,
              payments: true,
            },
          },
        },
      }),

      prisma.case.count({
        where,
      }),
    ]);

    return res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    next(error);
  }
});



/**
 * GET /api/cases/marketing-stats
 *
 * Реклама манбалари ва кампаниялар кесимида CRM статистикаси.
 */
router.get(
  '/marketing-stats',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const rows = await prisma.case.findMany({
        where: {
          source: {
            not: null,
          },
        },
        select: {
          id: true,
          source: true,
          campaign: true,
          startParameter: true,
          status: true,
          serviceType: true,
          createdAt: true,
          contracts: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const grouped = new Map();

      for (const item of rows) {
        const source = item.source || 'CRM';
        const campaign =
          item.campaign && item.campaign !== 'direct'
            ? item.campaign
            : 'direct';

        const key = `${source}::${campaign}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            source,
            campaign,
            startParameter: item.startParameter || null,
            total: 0,
            signedContracts: 0,
            completed: 0,
            rejected: 0,
          });
        }

        const row = grouped.get(key);

        row.total += 1;

        if (
          item.contracts?.some(
            (contract) => contract.status === 'SIGNED'
          )
        ) {
          row.signedContracts += 1;
        }

        if (item.status === 'COMPLETED') {
          row.completed += 1;
        }

        if (item.status === 'REJECTED') {
          row.rejected += 1;
        }
      }

      const campaigns = Array.from(grouped.values())
        .map((row) => ({
          ...row,
          contractConversion:
            row.total > 0
              ? Math.round(
                  (row.signedContracts / row.total) * 1000
                ) / 10
              : 0,
          completedConversion:
            row.total > 0
              ? Math.round(
                  (row.completed / row.total) * 1000
                ) / 10
              : 0,
        }))
        .sort((a, b) => b.total - a.total);

      const summary = campaigns.reduce(
        (acc, row) => {
          acc.total += row.total;
          acc.signedContracts += row.signedContracts;
          acc.completed += row.completed;
          acc.rejected += row.rejected;
          acc.bySource[row.source] =
            (acc.bySource[row.source] || 0) + row.total;
          return acc;
        },
        {
          total: 0,
          signedContracts: 0,
          completed: 0,
          rejected: 0,
          bySource: {},
        }
      );

      summary.contractConversion =
        summary.total > 0
          ? Math.round(
              (summary.signedContracts / summary.total) * 1000
            ) / 10
          : 0;

      summary.completedConversion =
        summary.total > 0
          ? Math.round(
              (summary.completed / summary.total) * 1000
            ) / 10
          : 0;

      return res.json({
        summary,
        campaigns,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cases/marketing-funnel
 *
 * CRM учун бот/реклама воронкаси ва ташлаб кетганлар рўйхати.
 */
router.get(
  '/marketing-funnel',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const visits = await prisma.marketingVisit.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      const now = Date.now();
      const abandonedCutoff = now - 30 * 60 * 1000;

      const caseIds = visits
        .map((item) => item.caseId)
        .filter(Boolean);

      const completedCases = caseIds.length
        ? await prisma.case.findMany({
            where: {
              id: { in: caseIds },
              status: 'COMPLETED',
            },
            select: { id: true },
          })
        : [];

      const completedSet = new Set(
        completedCases.map((item) => item.id)
      );

      const grouped = new Map();
      const abandonedPeople = [];

      for (const visit of visits) {
        const source = visit.source || 'DIRECT';
        const campaign = visit.campaign || 'direct';
        const key = `${source}::${campaign}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            source,
            campaign,
            startParameter: visit.startParam || null,
            botStarts: 0,
            applicationStarted: 0,
            phoneLinked: 0,
            serviceSelected: 0,
            confirmationReached: 0,
            casesCreated: 0,
            abandoned: 0,
            completed: 0,
          });
        }

        const row = grouped.get(key);
        row.botStarts += 1;

        if (visit.applicationStartedAt) {
          row.applicationStarted += 1;
        }

        if (visit.phoneLinkedAt) {
          row.phoneLinked += 1;
        }

        if (visit.serviceTypeSelected) {
          row.serviceSelected += 1;
        }

        if (
          ['CONFIRMATION_REACHED', 'CASE_CREATED'].includes(
            visit.funnelStep
          )
        ) {
          row.confirmationReached += 1;
        }

        if (visit.caseId || visit.convertedAt) {
          row.casesCreated += 1;
        }

        const lastActivity =
          visit.lastStepAt?.getTime?.() ||
          visit.updatedAt?.getTime?.() ||
          visit.createdAt?.getTime?.() ||
          now;

        const isAbandoned =
          !visit.convertedAt &&
          visit.funnelStep !== 'CANCELLED' &&
          lastActivity <= abandonedCutoff;

        if (isAbandoned) {
          row.abandoned += 1;

          abandonedPeople.push({
            id: visit.id,
            telegramId: visit.telegramId,
            username: visit.username,
            fullName:
              [visit.firstName, visit.lastName]
                .filter(Boolean)
                .join(' ') || null,
            source,
            campaign,
            startParameter: visit.startParam,
            funnelStep: visit.funnelStep || 'STARTED',
            serviceType: visit.serviceTypeSelected,
            createdAt: visit.createdAt,
            lastStepAt: visit.lastStepAt || visit.updatedAt,
            minutesIdle: Math.max(
              0,
              Math.floor((now - lastActivity) / 60000)
            ),
            reminderSentAt: visit.reminderSentAt,
          });
        }

        if (
          visit.caseId &&
          completedSet.has(visit.caseId)
        ) {
          row.completed += 1;
        }
      }

      const items = Array.from(grouped.values())
        .map((row) => ({
          ...row,
          phoneConversion:
            row.botStarts > 0
              ? Math.round(
                  (row.phoneLinked / row.botStarts) * 1000
                ) / 10
              : 0,
          caseConversion:
            row.botStarts > 0
              ? Math.round(
                  (row.casesCreated / row.botStarts) * 1000
                ) / 10
              : 0,
          abandonmentRate:
            row.botStarts > 0
              ? Math.round(
                  (row.abandoned / row.botStarts) * 1000
                ) / 10
              : 0,
        }))
        .sort((a, b) => b.botStarts - a.botStarts);

      return res.json({
        items,
        abandoned: abandonedPeople
          .sort(
            (a, b) =>
              new Date(b.lastStepAt) -
              new Date(a.lastStepAt)
          )
          .slice(0, 100),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cases/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.case.findUnique({
      where: {
        id: req.params.id,
      },

      include: caseInclude,
    });

    if (!item) {
      return res.status(404).json({
        error: 'Мурожаат топилмади',
      });
    }

    const canView =
      VIEW_ALL_ROLES.includes(req.user.role) ||
      item.receptionManagerId === req.user.id ||
      item.executorId === req.user.id ||
      (
        req.user.role === 'BRANCH_MANAGER' &&
        req.user.branchId &&
        item.branchId === req.user.branchId
      ) ||
      (
        req.user.role === 'BANK_EMPLOYEE' &&
        req.user.bankId &&
        await prisma.caseBankAssignment.count({
          where: {
            caseId: item.id,
            bankId: req.user.bankId,
            status: {
              notIn: ['CLOSED'],
            },
          },
        }) > 0
      );

    if (!canView) {
      return res.status(403).json({
        error: 'Ушбу мурожаатни кўриш учун рухсатингиз йўқ',
      });
    }

    return res.json({
      item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cases
 */
router.post(
  '/',
  allowRoles(...CREATE_ROLES),
  async (req, res, next) => {
    try {
      const parsed = createCaseSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Киритилган маълумотларда хато бор',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;

      const requestedAmount = parseAmount(
        data.requestedAmount
      );

      const serviceFee =
        ['REALTOR_SERVICE', 'SALE_PURCHASE'].includes(data.serviceType)
          ? parseAmount(data.serviceFee)
          : null;

      const saleDepositAmount =
        data.serviceType === 'SALE_PURCHASE'
          ? parseAmount(data.saleDepositAmount)
          : null;

      const saleDepositPaidAt =
        data.serviceType === 'SALE_PURCHASE'
          ? parseDate(data.saleDepositPaidAt)
          : null;

      const saleDepositDeadline =
        data.serviceType === 'SALE_PURCHASE'
          ? parseDate(data.saleDepositDeadline)
          : null;

      const investorAmount =
        data.serviceType === 'INVESTOR_PARTNERSHIP'
          ? parseAmount(data.investorAmount)
          : null;

      const investorProfitSharePercent =
        data.serviceType === 'INVESTOR_PARTNERSHIP'
          ? parseAmount(data.investorProfitSharePercent)
          : null;

      const investorContractStartDate =
        data.serviceType === 'INVESTOR_PARTNERSHIP'
          ? parseDate(data.investorContractStartDate)
          : null;

      const investorContractEndDate =
        data.serviceType === 'INVESTOR_PARTNERSHIP'
          ? parseDate(data.investorContractEndDate)
          : null;

      if (
        ['REALTOR_SERVICE', 'SALE_PURCHASE'].includes(data.serviceType) &&
        data.serviceFee !== undefined &&
        data.serviceFee !== null &&
        data.serviceFee !== '' &&
        serviceFee === null
      ) {
        return res.status(400).json({
          error: 'Хизмат ҳақи нотўғри',
        });
      }

      if (
        data.requestedAmount !== undefined &&
        data.requestedAmount !== null &&
        data.requestedAmount !== '' &&
        requestedAmount === null
      ) {
        return res.status(400).json({
          error: 'Сўралаётган сумма нотўғри',
        });
      }

      if (data.serviceType === 'SALE_PURCHASE') {
        if (!data.sellerFullName?.trim() || !data.sellerPhone?.trim()) {
          return res.status(400).json({ error: 'Олди-сотди учун сотувчи Ф.И.Ш. ва телефони шарт' });
        }
        if (!data.salePropertyAddress?.trim() || !data.saleCadastreNumber?.trim()) {
          return res.status(400).json({ error: 'Объект манзили ва кадастр рақамини киритинг' });
        }
        if (!(Number(requestedAmount) > 0)) {
          return res.status(400).json({ error: 'Олди-сотди нархини киритинг' });
        }
        if (!(Number(saleDepositAmount) > 0)) {
          return res.status(400).json({ error: 'Закалат суммасини киритинг' });
        }
        if (!saleDepositPaidAt) {
          return res.status(400).json({ error: 'Закалат берилган санани киритинг' });
        }
        if (!saleDepositDeadline) {
          return res.status(400).json({ error: 'Закалат муддатини киритинг' });
        }
        if (saleDepositDeadline < saleDepositPaidAt) {
          return res.status(400).json({ error: 'Закалат муддати берилган санадан олдин бўлиши мумкин эмас' });
        }
      }

      if (data.serviceType === 'INVESTOR_PARTNERSHIP') {
        if (!(Number(investorAmount) > 0)) {
          return res.status(400).json({
            error: 'Инвестиция суммасини киритинг',
          });
        }

        if (
          !(Number(investorProfitSharePercent) > 0) ||
          Number(investorProfitSharePercent) > 100
        ) {
          return res.status(400).json({
            error: 'Инвестор улуши 0 дан катта ва 100% дан ошмаслиги керак',
          });
        }

        if (!investorContractStartDate) {
          return res.status(400).json({
            error: 'Инвестор шартномаси бошланиш санасини киритинг',
          });
        }

        if (!investorContractEndDate) {
          return res.status(400).json({
            error: 'Инвестор шартномаси тугаш санасини киритинг',
          });
        }

        if (investorContractEndDate <= investorContractStartDate) {
          return res.status(400).json({
            error: 'Шартнома тугаш санаси бошланиш санасидан кейин бўлиши керак',
          });
        }
      }

      const birthDate = parseDate(data.birthDate);

      if (data.birthDate && !birthDate) {
        return res.status(400).json({
          error: 'Туғилган сана нотўғри',
        });
      }

      const branchId =
        req.user.role === 'BRANCH_MANAGER' ||
        req.user.role === 'RECEPTION_MANAGER'
          ? req.user.branchId
          : data.branchId || req.user.branchId || null;

      const result = await prisma.$transaction(
        async (tx) => {
          const displayId =
            await generateCaseDisplayId(tx, data.serviceType);

          const client = await tx.client.create({
            data: {
              fullName: data.fullName.trim(),
              phone: data.phone.trim(),
              pinfl: normalizeOptional(data.pinfl),
              passportSeries: normalizeOptional(
                data.passportSeries
              ),
              passportNumber: normalizeOptional(
                data.passportNumber
              ),
              birthDate,
              address: normalizeOptional(data.address),
            },
          });

          const item = await tx.case.create({
            data: {
              displayId,
              branchId,
              applicantClientId: client.id,
              receptionManagerId: req.user.id,
              serviceType: data.serviceType,
              status: 'NEW',
              requestedAmount:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? investorAmount
                  : requestedAmount,
              serviceFee:
                ['REALTOR_SERVICE', 'SALE_PURCHASE'].includes(data.serviceType)
                  ? serviceFee
                  : null,
              sellerFullName: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerFullName) : null,
              sellerPhone: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerPhone) : null,
              sellerPinfl: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerPinfl) : null,
              sellerPassportSeries: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerPassportSeries) : null,
              sellerPassportNumber: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerPassportNumber) : null,
              sellerAddress: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.sellerAddress) : null,
              salePropertyType: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.salePropertyType) : null,
              salePropertyAddress: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.salePropertyAddress) : null,
              saleCadastreNumber: data.serviceType === 'SALE_PURCHASE' ? normalizeOptional(data.saleCadastreNumber) : null,
              salePropertyArea: data.serviceType === 'SALE_PURCHASE' && data.salePropertyArea ? Number(data.salePropertyArea) : null,
              saleServiceFeePayer: data.serviceType === 'SALE_PURCHASE' ? (data.saleServiceFeePayer || 'BUYER') : null,
              saleDepositAmount: data.serviceType === 'SALE_PURCHASE' ? saleDepositAmount : null,
              saleDepositPaidAt: data.serviceType === 'SALE_PURCHASE' ? saleDepositPaidAt : null,
              saleDepositDeadline: data.serviceType === 'SALE_PURCHASE' ? saleDepositDeadline : null,
              saleDepositTermsAccepted: data.serviceType === 'SALE_PURCHASE',

              investorAmount:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? investorAmount
                  : null,
              investorProfitSharePercent:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? investorProfitSharePercent
                  : null,
              investorContractStartDate:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? investorContractStartDate
                  : null,
              investorContractEndDate:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? investorContractEndDate
                  : null,
              investorNotes:
                data.serviceType === 'INVESTOR_PARTNERSHIP'
                  ? normalizeOptional(data.investorNotes)
                  : null,

              bankName: normalizeOptional(
                data.bankName
              ),
              nextAction:
                normalizeOptional(data.nextAction) ||
                'Мижоз маълумотларини текшириш',
            },

            include: caseInclude,
          });

          await tx.caseHistory.create({
            data: {
              caseId: item.id,
              fromStatus: null,
              toStatus: 'NEW',
              note: 'Мурожаат яратилди',
            },
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'Case',
              entityId: item.id,
              action: 'CASE_CREATED',
              metadata: {
                displayId,
                serviceType: data.serviceType,
                applicantClientId: client.id,
              },
            },
          });

          return item;
        }
      );

      notifyNewCase(result.id).catch((error) => {
        console.error(
          'Telegram: янги мурожаат хабари юборилмади',
          error.message
        );
      });

      return res.status(201).json({
        message: 'Мурожаат муваффақиятли яратилди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * PATCH /api/cases/:id/finance-collateral
 *
 * Тасдиқланган кредит суммаси, 4.5% хизмат ҳақи
 * ва гаровга олинаётган мулк маълумотларини сақлайди.
 */
router.patch(
  '/:id/finance-collateral',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER',
    'RECEPTION_MANAGER',
    'EXECUTOR',
    'ACCOUNTANT'
  ),
  async (req, res, next) => {
    try {
      const parsed = updateFinanceCollateralSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Гаров мулки маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existingCase = await prisma.case.findUnique({
        where: {
          id: req.params.id,
        },
      });

      if (!existingCase) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const collateralArea = parseAmount(parsed.data.collateralArea);
      const collateralEstimatedValue = parseAmount(
        parsed.data.collateralEstimatedValue
      );

      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.case.update({
          where: {
            id: existingCase.id,
          },
          data: {
            collateralType: normalizeOptional(
              parsed.data.collateralType
            ),
            collateralAddress: normalizeOptional(
              parsed.data.collateralAddress
            ),
            collateralCadastreNumber: normalizeOptional(
              parsed.data.collateralCadastreNumber
            ),
            collateralOwnerFullName: normalizeOptional(
              parsed.data.collateralOwnerFullName
            ),
            collateralOwnerPinfl: normalizeOptional(
              parsed.data.collateralOwnerPinfl
            ),
            collateralArea,
            collateralEstimatedValue,
            collateralNotes: normalizeOptional(
              parsed.data.collateralNotes
            ),

            nextAction:
              'Гаров ҳужжатлари ва КАТМни банкка текширувга юбориш',
          },
          include: caseInclude,
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Case',
            entityId: existingCase.id,
            action: 'CASE_COLLATERAL_UPDATED',
            metadata: {
              collateralType: normalizeOptional(
                parsed.data.collateralType
              ),
              collateralCadastreNumber: normalizeOptional(
                parsed.data.collateralCadastreNumber
              ),
              collateralOwnerFullName: normalizeOptional(
                parsed.data.collateralOwnerFullName
              ),
              collateralEstimatedValue,
            },
          },
        });

        return item;
      });

      return res.json({
        message: 'Гаров мулки маълумотлари сақланди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * PATCH /api/cases/:id/participants
 *
 * Мурожаатчи, асосий қарз олувчи ва гаров эгаси маълумотларини сақлайди.
 */
router.patch(
  '/:id/participants',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER',
    'RECEPTION_MANAGER',
    'EXECUTOR'
  ),
  async (req, res, next) => {
    try {
      const parsed = updateParticipantsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Иштирокчилар маълумотларида хато бор',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existingCase = await prisma.case.findUnique({
        where: { id: req.params.id },
        include: {
          applicant: true,
          borrowers: {
            include: { client: true },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (!existingCase) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const data = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        let borrowerClient;

        if (data.borrowerSameAsApplicant) {
          borrowerClient = existingCase.applicant;
        } else {
          if (!data.borrower) {
            const error = new Error('Қарз олувчи маълумотларини киритинг');
            error.status = 400;
            throw error;
          }

          const currentBorrower = existingCase.borrowers[0];

          if (currentBorrower) {
            borrowerClient = await tx.client.update({
              where: { id: currentBorrower.clientId },
              data: {
                fullName: data.borrower.fullName,
                phone: normalizeOptional(data.borrower.phone),
                pinfl: normalizeOptional(data.borrower.pinfl),
                passportSeries: normalizeOptional(
                  data.borrower.passportSeries
                ),
                passportNumber: normalizeOptional(
                  data.borrower.passportNumber
                ),
                birthDate: parseDate(data.borrower.birthDate),
                address: normalizeOptional(data.borrower.address),
              },
            });
          } else {
            borrowerClient = await tx.client.create({
              data: {
                fullName: data.borrower.fullName,
                phone: normalizeOptional(data.borrower.phone),
                pinfl: normalizeOptional(data.borrower.pinfl),
                passportSeries: normalizeOptional(
                  data.borrower.passportSeries
                ),
                passportNumber: normalizeOptional(
                  data.borrower.passportNumber
                ),
                birthDate: parseDate(data.borrower.birthDate),
                address: normalizeOptional(data.borrower.address),
              },
            });
          }
        }

        const currentBorrower = existingCase.borrowers[0];

        if (currentBorrower) {
          await tx.borrower.update({
            where: { id: currentBorrower.id },
            data: {
              clientId: borrowerClient.id,
              status: 'APPROVED',
              approvedAt: currentBorrower.approvedAt || new Date(),
              rejectedAt: null,
            },
          });
        } else {
          await tx.borrower.create({
            data: {
              caseId: existingCase.id,
              clientId: borrowerClient.id,
              sequence: 1,
              status: 'APPROVED',
              approvedAt: new Date(),
            },
          });
        }

        let collateralOwner;

        if (data.collateralOwnerSameAsBorrower) {
          collateralOwner = {
            fullName: borrowerClient.fullName,
            phone: borrowerClient.phone,
            pinfl: borrowerClient.pinfl,
            passportSeries: borrowerClient.passportSeries,
            passportNumber: borrowerClient.passportNumber,
            address: borrowerClient.address,
          };
        } else {
          if (!data.collateralOwner) {
            const error = new Error('Гаров эгаси маълумотларини киритинг');
            error.status = 400;
            throw error;
          }

          collateralOwner = data.collateralOwner;
        }

        const item = await tx.case.update({
          where: { id: existingCase.id },
          data: {
            collateralOwnerFullName: collateralOwner.fullName,
            collateralOwnerPinfl: normalizeOptional(collateralOwner.pinfl),
            collateralOwnerPassportSeries: normalizeOptional(
              collateralOwner.passportSeries
            ),
            collateralOwnerPassportNumber: normalizeOptional(
              collateralOwner.passportNumber
            ),
            collateralOwnerPhone: normalizeOptional(collateralOwner.phone),
            collateralOwnerAddress: normalizeOptional(collateralOwner.address),
            nextAction:
              existingCase.nextAction ||
              'Иштирокчилар ва гаров ҳужжатларини текшириш',
          },
          include: caseInclude,
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Case',
            entityId: existingCase.id,
            action: 'CASE_PARTICIPANTS_UPDATED',
            metadata: {
              applicantClientId: existingCase.applicantClientId,
              borrowerClientId: borrowerClient.id,
              borrowerSameAsApplicant: data.borrowerSameAsApplicant,
              collateralOwnerSameAsBorrower:
                data.collateralOwnerSameAsBorrower,
              collateralOwnerFullName: collateralOwner.fullName,
            },
          },
        });

        return item;
      });

      return res.json({
        message: 'Мурожаатчи, қарз олувчи ва гаров эгаси сақланди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/cases/:id/status
 */
router.patch(
  '/:id/status',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER',
    'RECEPTION_MANAGER',
    'EXECUTOR',
    'BANK_EMPLOYEE'
  ),
  async (req, res, next) => {
    try {
      const parsed = updateStatusSchema.safeParse(
        req.body
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Статус маълумоти нотўғри',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const existingCase =
        await prisma.case.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!existingCase) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const item = await tx.case.update({
            where: {
              id: req.params.id,
            },

            data: {
              status: parsed.data.status,

              completedAt:
                parsed.data.status === 'COMPLETED'
                  ? new Date()
                  : existingCase.completedAt,
            },

            include: caseInclude,
          });

          await tx.caseHistory.create({
            data: {
              caseId: existingCase.id,
              fromStatus: existingCase.status,
              toStatus: parsed.data.status,
              note:
                normalizeOptional(parsed.data.note) ||
                'Статус ўзгартирилди',
            },
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'Case',
              entityId: existingCase.id,
              action: 'CASE_STATUS_CHANGED',
              metadata: {
                fromStatus: existingCase.status,
                toStatus: parsed.data.status,
                note:
                  normalizeOptional(parsed.data.note),
              },
            },
          });

          return item;
        }
      );

      notifyCaseStatusChanged(
        result.id,
        existingCase.status,
        parsed.data.status
      ).catch((error) => {
        console.error(
          'Telegram: статус ўзгариши хабари юборилмади',
          error.message
        );
      });

      return res.json({
        message: 'Мурожаат ҳолати ўзгартирилди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/cases/:id/assign-executor
 */
router.patch(
  '/:id/assign-executor',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER'
  ),
  async (req, res, next) => {
    try {
      const parsed =
        assignExecutorSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Ижрочи маълумоти нотўғри',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const executor = await prisma.user.findFirst({
        where: {
          id: parsed.data.executorId,
          role: 'EXECUTOR',
          isActive: true,
        },

        select: {
          id: true,
          fullName: true,
          branchId: true,
        },
      });

      if (!executor) {
        return res.status(404).json({
          error: 'Фаол ижрочи топилмади',
        });
      }

      const existingCase =
        await prisma.case.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!existingCase) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const item = await tx.case.update({
            where: {
              id: existingCase.id,
            },

            data: {
              executorId: executor.id,
              status: 'ASSIGNED_TO_EXECUTOR',
              nextAction:
                'Ижрочи ишни қабул қилиши керак',
            },

            include: caseInclude,
          });

          await tx.caseHistory.create({
            data: {
              caseId: existingCase.id,
              fromStatus: existingCase.status,
              toStatus: 'ASSIGNED_TO_EXECUTOR',
              note: `Иш ${executor.fullName}га бириктирилди`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'Case',
              entityId: existingCase.id,
              action: 'EXECUTOR_ASSIGNED',
              metadata: {
                executorId: executor.id,
                executorName: executor.fullName,
              },
            },
          });

          return item;
        }
      );

      return res.json({
        message: 'Иш ижрочига бириктирилди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;