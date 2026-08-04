import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

/* =========================================================
   CONSTANTS
========================================================= */

const OFFER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'SELECTED',
  'REJECTED',
  'CANCELLED',
];

const VIEW_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'BANK_EMPLOYEE',
  'LAWYER',
  'ACCOUNTANT',
];

const CREATE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'BANK_EMPLOYEE',
];

const UPDATE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'BANK_EMPLOYEE',
];

const SELECT_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

const DELETE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
];

/* =========================================================
   VALIDATION
========================================================= */

const createOfferSchema = z.object({
  bankName: z
    .string()
    .trim()
    .min(2, 'Банк номи киритилиши шарт')
    .max(200, 'Банк номи жуда узун'),

  status: z
    .enum(OFFER_STATUSES)
    .optional()
    .default('SUBMITTED'),

  interestRate: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  termMonths: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  approvedAmount: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  initialPayment: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  monthlyPayment: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  insuranceAmount: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  commissionAmount: z
    .union([z.string(), z.number()])
    .optional()
    .nullable(),

  validUntil: z
    .string()
    .trim()
    .optional()
    .nullable(),

  conditions: z
    .string()
    .trim()
    .max(3000, 'Шартлар матни жуда узун')
    .optional()
    .nullable(),

  rejectionReason: z
    .string()
    .trim()
    .max(2000, 'Рад этиш сабаби жуда узун')
    .optional()
    .nullable(),
});

const updateOfferSchema = createOfferSchema.partial();

/* =========================================================
   HELPERS
========================================================= */

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function parseDecimal(value, fieldName, options = {}) {
  const { min = 0, max = null } = options;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const normalized =
    typeof value === 'string'
      ? value
          .replace(/\s/g, '')
          .replace(/,/g, '.')
      : value;

  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} нотўғри киритилган`);
  }

  if (number < min) {
    throw new Error(
      `${fieldName} ${min} дан кам бўлиши мумкин эмас`
    );
  }

  if (max !== null && number > max) {
    throw new Error(
      `${fieldName} ${max} дан катта бўлиши мумкин эмас`
    );
  }

  return number;
}

function parseInteger(value, fieldName, options = {}) {
  const { min = 1, max = null } = options;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new Error(`${fieldName} бутун сон бўлиши керак`);
  }

  if (number < min) {
    throw new Error(
      `${fieldName} ${min} дан кам бўлиши мумкин эмас`
    );
  }

  if (max !== null && number > max) {
    throw new Error(
      `${fieldName} ${max} дан катта бўлиши мумкин эмас`
    );
  }

  return number;
}

function parseDate(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} нотўғри киритилган`);
  }

  return date;
}

function prepareOfferData(data) {
  return {
    bankName:
      data.bankName !== undefined
        ? data.bankName.trim()
        : undefined,

    status: data.status,

    interestRate:
      data.interestRate !== undefined
        ? parseDecimal(
            data.interestRate,
            'Фоиз ставкаси',
            {
              min: 0,
              max: 100,
            }
          )
        : undefined,

    termMonths:
      data.termMonths !== undefined
        ? parseInteger(
            data.termMonths,
            'Кредит муддати',
            {
              min: 1,
              max: 600,
            }
          )
        : undefined,

    approvedAmount:
      data.approvedAmount !== undefined
        ? parseDecimal(
            data.approvedAmount,
            'Тасдиқланган сумма'
          )
        : undefined,

    initialPayment:
      data.initialPayment !== undefined
        ? parseDecimal(
            data.initialPayment,
            'Бошланғич тўлов'
          )
        : undefined,

    monthlyPayment:
      data.monthlyPayment !== undefined
        ? parseDecimal(
            data.monthlyPayment,
            'Ойлик тўлов'
          )
        : undefined,

    insuranceAmount:
      data.insuranceAmount !== undefined
        ? parseDecimal(
            data.insuranceAmount,
            'Суғурта суммаси'
          )
        : undefined,

    commissionAmount:
      data.commissionAmount !== undefined
        ? parseDecimal(
            data.commissionAmount,
            'Комиссия суммаси'
          )
        : undefined,

    validUntil:
      data.validUntil !== undefined
        ? parseDate(
            data.validUntil,
            'Таклиф амал қилиш санаси'
          )
        : undefined,

    conditions:
      data.conditions !== undefined
        ? normalizeOptionalText(data.conditions)
        : undefined,

    rejectionReason:
      data.rejectionReason !== undefined
        ? normalizeOptionalText(
            data.rejectionReason
          )
        : undefined,
  };
}

async function getCaseOrFail(caseId) {
  return prisma.case.findUnique({
    where: {
      id: caseId,
    },

    select: {
      id: true,
      displayId: true,
      branchId: true,
      receptionManagerId: true,
      executorId: true,
      applicantClientId: true,
      status: true,
      bankName: true,
      approvedAmount: true,
      bankAssignments: {
        select: {
          id: true,
          bankId: true,
          status: true,
        },
      },
    },
  });
}

function canViewCase(user, caseItem) {
  if (
    [
      'SUPER_ADMIN',
      'DIRECTOR',
      'LAWYER',
      'ACCOUNTANT',
    ].includes(user.role)
  ) {
    return true;
  }

  if (
    user.role === 'BRANCH_MANAGER' &&
    user.branchId &&
    user.branchId === caseItem.branchId
  ) {
    return true;
  }

  if (
    user.role === 'RECEPTION_MANAGER' &&
    caseItem.receptionManagerId === user.id
  ) {
    return true;
  }

  if (
    user.role === 'EXECUTOR' &&
    caseItem.executorId === user.id
  ) {
    return true;
  }

  /*
    Ҳозирча банк ходимлари барча банк текширувидаги
    мурожаатларни кўра олади.

    Кейин Bank ва CaseBankAssignment модели қўшилганда
    фақат ўзига юборилган мурожаатларни кўрадиган қиламиз.
  */
  if (user.role === 'BANK_EMPLOYEE') {
    return Boolean(
      user.bankId &&
      caseItem.bankAssignments?.some(
        (assignment) =>
          assignment.bankId === user.bankId &&
          assignment.status !== 'CLOSED'
      )
    );
  }

  return false;
}

function canModifyOffer(user, offer) {
  if (
    [
      'SUPER_ADMIN',
      'DIRECTOR',
      'BRANCH_MANAGER',
      'RECEPTION_MANAGER',
    ].includes(user.role)
  ) {
    return true;
  }

  if (
    user.role === 'BANK_EMPLOYEE' &&
    offer.bankEmployeeId === user.id
  ) {
    return true;
  }

  return false;
}

const offerInclude = {
  bankEmployee: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      role: true,
    },
  },

  case: {
    select: {
      id: true,
      displayId: true,
      status: true,
      serviceType: true,
      requestedAmount: true,
      approvedAmount: true,
      bankName: true,

      applicant: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
    },
  },
};

/* =========================================================
   AUTH
========================================================= */

router.use(auth);

/* =========================================================
   GET /api/bank-offers
   Барча таклифлар
========================================================= */

router.get(
  '/',
  allowRoles(...VIEW_ROLES),
  async (req, res, next) => {
    try {
      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        100
      );

      const caseId =
        typeof req.query.caseId === 'string'
          ? req.query.caseId.trim()
          : '';

      const status =
        typeof req.query.status === 'string'
          ? req.query.status.trim()
          : '';

      const bankName =
        typeof req.query.bankName === 'string'
          ? req.query.bankName.trim()
          : '';

      const where = {};

      if (caseId) {
        where.caseId = caseId;
      }

      if (
        status &&
        OFFER_STATUSES.includes(status)
      ) {
        where.status = status;
      }

      if (bankName) {
        where.bankName = {
          contains: bankName,
          mode: 'insensitive',
        };
      }

      if (req.user.role === 'BANK_EMPLOYEE') {
        if (!req.user.bankId) {
          where.id = '__NO_BANK_ASSIGNED__';
        } else {
          where.bankId = req.user.bankId;
        }
      }

      const [items, total] =
        await prisma.$transaction([
          prisma.bankOffer.findMany({
            where,

            include: offerInclude,

            orderBy: [
              {
                status: 'asc',
              },
              {
                createdAt: 'desc',
              },
            ],

            skip: (page - 1) * limit,
            take: limit,
          }),

          prisma.bankOffer.count({
            where,
          }),
        ]);

      return res.status(200).json({
        ok: true,
        items,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(
            Math.ceil(total / limit),
            1
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   GET /api/bank-offers/case/:caseId
   Битта мурожаатга тегишли таклифлар
========================================================= */

router.get(
  '/case/:caseId',
  allowRoles(...VIEW_ROLES),
  async (req, res, next) => {
    try {
      const caseItem = await getCaseOrFail(
        req.params.caseId
      );

      if (!caseItem) {
        return res.status(404).json({
          ok: false,
          error: 'Мурожаат топилмади',
        });
      }

      if (!canViewCase(req.user, caseItem)) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу мурожаат таклифларини кўриш учун рухсатингиз йўқ',
        });
      }

      const where = {
        caseId: caseItem.id,
      };

      if (req.user.role === 'BANK_EMPLOYEE') {
        where.bankId = req.user.bankId;
      }

      const items = await prisma.bankOffer.findMany({
        where,

        include: {
          bankEmployee: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },

        orderBy: [
          {
            status: 'asc',
          },
          {
            interestRate: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      const selectedOffer =
        items.find(
          (offer) => offer.status === 'SELECTED'
        ) || null;

      return res.status(200).json({
        ok: true,

        case: {
          id: caseItem.id,
          displayId: caseItem.displayId,
          status: caseItem.status,
          bankName: caseItem.bankName,
          approvedAmount:
            caseItem.approvedAmount,
        },

        items,
        selectedOffer,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   GET /api/bank-offers/:offerId
   Битта таклиф
========================================================= */

router.get(
  '/:offerId',
  allowRoles(...VIEW_ROLES),
  async (req, res, next) => {
    try {
      const item = await prisma.bankOffer.findUnique({
        where: {
          id: req.params.offerId,
        },

        include: offerInclude,
      });

      if (!item) {
        return res.status(404).json({
          ok: false,
          error: 'Банк таклифи топилмади',
        });
      }

      if (!canViewCase(req.user, item.case)) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу банк таклифини кўриш учун рухсатингиз йўқ',
        });
      }

      if (
        req.user.role === 'BANK_EMPLOYEE' &&
        item.bankEmployeeId !== req.user.id
      ) {
        return res.status(403).json({
          ok: false,
          error:
            'Бошқа банк ходимининг таклифини кўра олмайсиз',
        });
      }

      return res.status(200).json({
        ok: true,
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POST /api/bank-offers/case/:caseId
   Янги банк таклифи
========================================================= */

router.post(
  '/case/:caseId',
  allowRoles(...CREATE_ROLES),
  async (req, res, next) => {
    try {
      const parsed =
        createOfferSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error:
            'Банк таклифи маълумотларида хато бор',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await getCaseOrFail(
        req.params.caseId
      );

      if (!caseItem) {
        return res.status(404).json({
          ok: false,
          error: 'Мурожаат топилмади',
        });
      }

      if (!canViewCase(req.user, caseItem)) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу мурожаатга таклиф киритиш учун рухсатингиз йўқ',
        });
      }

      let offerData;

      try {
        offerData = prepareOfferData(parsed.data);
      } catch (validationError) {
        return res.status(400).json({
          ok: false,
          error: validationError.message,
        });
      }

      const requestedStatus =
        offerData.status || 'SUBMITTED';

      /*
        Янги таклифни тўғридан-тўғри SELECTED
        қилиб яратиш мумкин эмас.
      */
      if (requestedStatus === 'SELECTED') {
        return res.status(400).json({
          ok: false,
          error:
            'Таклифни яратиш пайтида танланган қилиб белгилаб бўлмайди',
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const item = await tx.bankOffer.create({
            data: {
              caseId: caseItem.id,

              bankId:
                req.user.role === 'BANK_EMPLOYEE'
                  ? req.user.bankId
                  : null,

              assignmentId:
                req.user.role === 'BANK_EMPLOYEE'
                  ? caseItem.bankAssignments?.find(
                      (assignment) =>
                        assignment.bankId === req.user.bankId
                    )?.id || null
                  : null,

              bankEmployeeId:
                req.user.role === 'BANK_EMPLOYEE'
                  ? req.user.id
                  : null,

              ...offerData,

              bankName:
                req.user.role === 'BANK_EMPLOYEE'
                  ? req.user.bank?.name || offerData.bankName
                  : offerData.bankName,

              status: requestedStatus,

              submittedAt:
                requestedStatus === 'SUBMITTED'
                  ? new Date()
                  : null,
            },

            include: offerInclude,
          });

          if (item.assignmentId) {
            await tx.caseBankAssignment.update({
              where: {
                id: item.assignmentId,
              },
              data: {
                status:
                  item.status === 'REJECTED'
                    ? 'REJECTED'
                    : 'OFFER_SUBMITTED',
                assignedBankEmployeeId:
                  item.bankEmployeeId,
                respondedAt: new Date(),
              },
            });
          }

          /*
            Биринчи банк таклифи келганда кейсни
            BANK_REVIEW ҳолатига ўтказамиз.
          */
          if (
            [
              'NEW',
              'DATA_COLLECTION',
            ].includes(caseItem.status)
          ) {
            await tx.case.update({
              where: {
                id: caseItem.id,
              },

              data: {
                status: 'BANK_REVIEW',
                nextAction:
                  'Банк таклифларини кўриб чиқиш',
              },
            });

            await tx.caseHistory.create({
              data: {
                caseId: caseItem.id,
                fromStatus: caseItem.status,
                toStatus: 'BANK_REVIEW',
                note:
                  `${item.bankName} банк таклифи киритилди`,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'BankOffer',
              entityId: item.id,
              action: 'BANK_OFFER_CREATED',

              metadata: {
                caseId: caseItem.id,
                caseDisplayId:
                  caseItem.displayId,
                bankName: item.bankName,
                status: item.status,
                interestRate:
                  item.interestRate?.toString() ||
                  null,
                approvedAmount:
                  item.approvedAmount?.toString() ||
                  null,
              },
            },
          });

          return item;
        }
      );

      return res.status(201).json({
        ok: true,
        message:
          'Банк таклифи муваффақиятли қўшилди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PATCH /api/bank-offers/:offerId
   Таклифни таҳрирлаш
========================================================= */

router.patch(
  '/:offerId',
  allowRoles(...UPDATE_ROLES),
  async (req, res, next) => {
    try {
      const parsed =
        updateOfferSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error:
            'Банк таклифи маълумотларида хато бор',
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const existingOffer =
        await prisma.bankOffer.findUnique({
          where: {
            id: req.params.offerId,
          },

          include: {
            case: {
              select: {
                id: true,
                displayId: true,
                branchId: true,
                receptionManagerId: true,
                executorId: true,
                status: true,
              },
            },
          },
        });

      if (!existingOffer) {
        return res.status(404).json({
          ok: false,
          error: 'Банк таклифи топилмади',
        });
      }

      if (
        !canModifyOffer(req.user, existingOffer)
      ) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу банк таклифини таҳрирлаш учун рухсатингиз йўқ',
        });
      }

      if (
        existingOffer.status === 'SELECTED' &&
        ![
          'SUPER_ADMIN',
          'DIRECTOR',
        ].includes(req.user.role)
      ) {
        return res.status(409).json({
          ok: false,
          error:
            'Танланган таклифни фақат директор ёки бош администратор таҳрирлай олади',
        });
      }

      let offerData;

      try {
        offerData = prepareOfferData(parsed.data);
      } catch (validationError) {
        return res.status(400).json({
          ok: false,
          error: validationError.message,
        });
      }

      /*
        SELECTED ҳолати фақат алоҳида select
        endpoint орқали берилади.
      */
      if (offerData.status === 'SELECTED') {
        return res.status(400).json({
          ok: false,
          error:
            'Таклифни танлаш учун махсус “select” endpoint’идан фойдаланинг',
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const item = await tx.bankOffer.update({
            where: {
              id: existingOffer.id,
            },

            data: {
              ...offerData,

              submittedAt:
                offerData.status === 'SUBMITTED' &&
                !existingOffer.submittedAt
                  ? new Date()
                  : undefined,

              selectedAt: null,
            },

            include: offerInclude,
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'BankOffer',
              entityId: item.id,
              action: 'BANK_OFFER_UPDATED',

              metadata: {
                caseId: item.caseId,
                bankName: item.bankName,
                oldStatus:
                  existingOffer.status,
                newStatus: item.status,
              },
            },
          });

          return item;
        }
      );

      return res.status(200).json({
        ok: true,
        message:
          'Банк таклифи муваффақиятли янгиланди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POST /api/bank-offers/:offerId/select
   Таклифни танлаш
========================================================= */

router.post(
  '/:offerId/select',
  allowRoles(...SELECT_ROLES),
  async (req, res, next) => {
    try {
      const existingOffer =
        await prisma.bankOffer.findUnique({
          where: {
            id: req.params.offerId,
          },

          include: {
            case: {
              select: {
                id: true,
                displayId: true,
                branchId: true,
                receptionManagerId: true,
                executorId: true,
                status: true,
              },
            },
          },
        });

      if (!existingOffer) {
        return res.status(404).json({
          ok: false,
          error: 'Банк таклифи топилмади',
        });
      }

      if (
        !canViewCase(
          req.user,
          existingOffer.case
        )
      ) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу банк таклифини танлаш учун рухсатингиз йўқ',
        });
      }

      if (
        [
          'REJECTED',
          'CANCELLED',
        ].includes(existingOffer.status)
      ) {
        return res.status(409).json({
          ok: false,
          error:
            'Рад этилган ёки бекор қилинган таклифни танлаб бўлмайди',
        });
      }

      if (!existingOffer.approvedAmount) {
        return res.status(400).json({
          ok: false,
          error:
            'Тасдиқланган сумма киритилмаган таклифни танлаб бўлмайди',
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          /*
            Шу кейсда аввал танланган таклифлар бўлса,
            SUBMITTED ҳолатига қайтарамиз.
          */
          await tx.bankOffer.updateMany({
            where: {
              caseId: existingOffer.caseId,
              status: 'SELECTED',

              id: {
                not: existingOffer.id,
              },
            },

            data: {
              status: 'SUBMITTED',
              selectedAt: null,
            },
          });

          const item = await tx.bankOffer.update({
            where: {
              id: existingOffer.id,
            },

            data: {
              status: 'SELECTED',
              selectedAt: new Date(),

              submittedAt:
                existingOffer.submittedAt ||
                new Date(),
            },

            include: offerInclude,
          });

          const oldCaseStatus =
            existingOffer.case.status;

          const serviceFeePercent = 4.5;
          const approvedAmount = Number(
            existingOffer.approvedAmount
          );
          const serviceFeeAmount = Math.round(
            (approvedAmount * serviceFeePercent) / 100
          );

          if (existingOffer.bankId) {
            await tx.caseBankAssignment.updateMany({
              where: {
                caseId: existingOffer.caseId,
              },
              data: {
                status: 'CLOSED',
              },
            });

            await tx.caseBankAssignment.updateMany({
              where: {
                caseId: existingOffer.caseId,
                bankId: existingOffer.bankId,
              },
              data: {
                status: 'SELECTED',
                respondedAt: new Date(),
              },
            });
          }

          await tx.case.update({
            where: {
              id: existingOffer.caseId,
            },

            data: {
              bankName: existingOffer.bankName,
              approvedAmount:
                existingOffer.approvedAmount,

              serviceFeePercent,
              serviceFeeAutoAmount:
                serviceFeeAmount,
              serviceFee:
                serviceFeeAmount,

              status: 'CLIENT_PREAPPROVED',

              nextAction:
                'Мижозни банк таклифи билан таништириш',
            },
          });

          await tx.caseHistory.create({
            data: {
              caseId: existingOffer.caseId,
              fromStatus: oldCaseStatus,
              toStatus:
                'CLIENT_PREAPPROVED',

              note:
                `${existingOffer.bankName} банк таклифи танланди`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'BankOffer',
              entityId: item.id,
              action: 'BANK_OFFER_SELECTED',

              metadata: {
                caseId:
                  existingOffer.caseId,
                caseDisplayId:
                  existingOffer.case.displayId,
                bankName:
                  existingOffer.bankName,
                approvedAmount:
                  existingOffer.approvedAmount?.toString() ||
                  null,
                interestRate:
                  existingOffer.interestRate?.toString() ||
                  null,
                termMonths:
                  existingOffer.termMonths,
                serviceFeePercent: 4.5,
                serviceFeeAmount,
              },
            },
          });

          return item;
        }
      );

      return res.status(200).json({
        ok: true,
        message:
          'Банк таклифи муваффақиятли танланди',
        item: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE /api/bank-offers/:offerId
   Таклифни ўчириш
========================================================= */

router.delete(
  '/:offerId',
  allowRoles(...DELETE_ROLES),
  async (req, res, next) => {
    try {
      const existingOffer =
        await prisma.bankOffer.findUnique({
          where: {
            id: req.params.offerId,
          },

          include: {
            case: {
              select: {
                id: true,
                displayId: true,
                branchId: true,
                receptionManagerId: true,
                executorId: true,
              },
            },
          },
        });

      if (!existingOffer) {
        return res.status(404).json({
          ok: false,
          error: 'Банк таклифи топилмади',
        });
      }

      if (
        !canViewCase(
          req.user,
          existingOffer.case
        )
      ) {
        return res.status(403).json({
          ok: false,
          error:
            'Ушбу банк таклифини ўчириш учун рухсатингиз йўқ',
        });
      }

      if (
        existingOffer.status === 'SELECTED'
      ) {
        return res.status(409).json({
          ok: false,
          error:
            'Танланган банк таклифини ўчириб бўлмайди. Аввал бошқа таклифни танланг',
        });
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              entityType: 'BankOffer',
              entityId: existingOffer.id,
              action: 'BANK_OFFER_DELETED',

              metadata: {
                caseId:
                  existingOffer.caseId,
                caseDisplayId:
                  existingOffer.case.displayId,
                bankName:
                  existingOffer.bankName,
                status:
                  existingOffer.status,
              },
            },
          });

          await tx.bankOffer.delete({
            where: {
              id: existingOffer.id,
            },
          });
        }
      );

      return res.status(200).json({
        ok: true,
        message:
          'Банк таклифи муваффақиятли ўчирилди',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;