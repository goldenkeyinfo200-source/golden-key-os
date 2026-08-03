import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

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

const generateCaseDisplayId = async (tx) => {
  const year = new Date().getFullYear();
  const prefix = `GK-IP-${year}-`;

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

    const where = {};

    if (status && caseStatuses.includes(status)) {
      where.status = status;
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
            await generateCaseDisplayId(tx);

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
              requestedAmount,
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
          error: 'Молиявий ёки гаров маълумотлари нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existingCase = await prisma.case.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          bankOffers: {
            where: {
              status: 'SELECTED',
            },
            orderBy: {
              selectedAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!existingCase) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      const selectedOffer = existingCase.bankOffers[0] || null;

      const bodyApprovedAmount = parseAmount(parsed.data.approvedAmount);
      const selectedApprovedAmount = parseAmount(
        selectedOffer?.approvedAmount?.toString()
      );
      const existingApprovedAmount = parseAmount(
        existingCase.approvedAmount?.toString()
      );

      const approvedAmount =
        bodyApprovedAmount ??
        selectedApprovedAmount ??
        existingApprovedAmount;

      const percentInput = parseAmount(parsed.data.serviceFeePercent);
      const currentPercent = parseAmount(
        existingCase.serviceFeePercent?.toString()
      );

      const serviceFeePercent =
        percentInput ?? currentPercent ?? 4.5;

      if (serviceFeePercent > 100) {
        return res.status(400).json({
          error: 'Хизмат ҳақи фоизи 100% дан ошмаслиги керак',
        });
      }

      const overrideAmount = parseAmount(
        parsed.data.serviceFeeOverride
      );

      const fee = calculateServiceFee({
        approvedAmount,
        percent: serviceFeePercent,
        overrideAmount,
      });

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
            approvedAmount,
            serviceFeePercent: fee.percent,
            serviceFeeAutoAmount: fee.autoAmount,
            serviceFee: fee.finalAmount,

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
          },
          include: caseInclude,
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Case',
            entityId: existingCase.id,
            action: 'CASE_FINANCE_COLLATERAL_UPDATED',
            metadata: {
              approvedAmount,
              serviceFeePercent: fee.percent,
              serviceFeeAutoAmount: fee.autoAmount,
              serviceFeeFinalAmount: fee.finalAmount,
              serviceFeeOverridden:
                overrideAmount !== null &&
                overrideAmount !== fee.autoAmount,
              collateralType: normalizeOptional(
                parsed.data.collateralType
              ),
              collateralCadastreNumber: normalizeOptional(
                parsed.data.collateralCadastreNumber
              ),
            },
          },
        });

        return item;
      });

      return res.json({
        message:
          'Молиявий маълумотлар ва гаров мулки сақланди',
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