import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

const branchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Филиал номи камида 2 та белгидан иборат бўлиши керак')
    .max(150, 'Филиал номи жуда узун'),

  city: z
    .string()
    .trim()
    .min(2, 'Шаҳарни киритинг')
    .max(100, 'Шаҳар номи жуда узун'),

  address: z
    .string()
    .trim()
    .max(300, 'Манзил жуда узун')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .trim()
    .max(30, 'Телефон рақами жуда узун')
    .optional()
    .or(z.literal('')),
});

const normalizeOptional = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const normalized = value.trim();

  return normalized || null;
};

/*
|--------------------------------------------------------------------------
| Барча /api/branches маршрутлари авторизация талаб қилади
|--------------------------------------------------------------------------
*/

router.use(auth);

/*
|--------------------------------------------------------------------------
| GET /api/branches
|--------------------------------------------------------------------------
|
| SUPER_ADMIN ва DIRECTOR:
|   барча филиалларни кўради.
|
| BRANCH_MANAGER:
|   фақат ўз филиалини кўради.
|
*/

router.get(
  '/',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER'
  ),
  async (req, res, next) => {
    try {
      const where = {};

      if (req.user.role === 'BRANCH_MANAGER') {
        if (!req.user.branchId) {
          return res.json({
            items: [],
          });
        }

        where.id = req.user.branchId;
      }

      const items = await prisma.branch.findMany({
        where,

        orderBy: [
          {
            city: 'asc',
          },
          {
            name: 'asc',
          },
        ],

        include: {
          _count: {
            select: {
              users: true,
              cases: true,
            },
          },

          users: {
            where: {
              role: 'BRANCH_MANAGER',
              isActive: true,
            },

            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              role: true,
            },

            take: 1,
          },
        },
      });

      const branches = items.map((branch) => ({
        id: branch.id,
        companyId: branch.companyId,
        name: branch.name,
        city: branch.city,
        address: branch.address,
        phone: branch.phone,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,

        employeesCount: branch._count.users,
        casesCount: branch._count.cases,

        manager: branch.users[0] || null,
      }));

      return res.json({
        items: branches,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/branches/:id
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER'
  ),
  async (req, res, next) => {
    try {
      if (
        req.user.role === 'BRANCH_MANAGER' &&
        req.user.branchId !== req.params.id
      ) {
        return res.status(403).json({
          error: 'Бошқа филиал маълумотларини кўриш учун рухсат йўқ',
        });
      }

      const item = await prisma.branch.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          users: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              login: true,
              role: true,
              isActive: true,
              createdAt: true,
            },

            orderBy: {
              fullName: 'asc',
            },
          },

          _count: {
            select: {
              users: true,
              cases: true,
            },
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          error: 'Филиал топилмади',
        });
      }

      return res.json({
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/branches
|--------------------------------------------------------------------------
|
| Янги филиални фақат SUPER_ADMIN ёки DIRECTOR ярата олади.
|
*/

router.post(
  '/',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR'
  ),
  async (req, res, next) => {
    try {
      const parsed = branchSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Филиал маълумотларида хато бор',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const companyId =
        req.user.companyId ||
        req.body.companyId ||
        null;

      if (!companyId) {
        return res.status(400).json({
          error:
            'Филиални яратиш учун компания аниқланмади',
        });
      }

      const company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        select: {
          id: true,
          name: true,
        },
      });

      if (!company) {
        return res.status(404).json({
          error: 'Компания топилмади',
        });
      }

      const item = await prisma.branch.create({
        data: {
          companyId,
          name: parsed.data.name.trim(),
          city: parsed.data.city.trim(),
          address: normalizeOptional(
            parsed.data.address
          ),
          phone: normalizeOptional(
            parsed.data.phone
          ),
        },
      });

      return res.status(201).json({
        message: 'Филиал муваффақиятли қўшилди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/branches/:id
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR'
  ),
  async (req, res, next) => {
    try {
      const parsed = branchSchema.partial().safeParse(
        req.body
      );

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Филиал маълумотларида хато бор',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existing = await prisma.branch.findUnique({
        where: {
          id: req.params.id,
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Филиал топилмади',
        });
      }

      const data = {};

      if (parsed.data.name !== undefined) {
        data.name = parsed.data.name.trim();
      }

      if (parsed.data.city !== undefined) {
        data.city = parsed.data.city.trim();
      }

      if (parsed.data.address !== undefined) {
        data.address = normalizeOptional(
          parsed.data.address
        );
      }

      if (parsed.data.phone !== undefined) {
        data.phone = normalizeOptional(
          parsed.data.phone
        );
      }

      const item = await prisma.branch.update({
        where: {
          id: req.params.id,
        },

        data,
      });

      return res.json({
        message: 'Филиал маълумотлари янгиланди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/branches/:id
|--------------------------------------------------------------------------
|
| Ҳозир филиални фақат ичида ходим ва мурожаат бўлмаса ўчириш мумкин.
|
*/

router.delete(
  '/:id',
  allowRoles('SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const existing = await prisma.branch.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          _count: {
            select: {
              users: true,
              cases: true,
            },
          },
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Филиал топилмади',
        });
      }

      if (
        existing._count.users > 0 ||
        existing._count.cases > 0
      ) {
        return res.status(409).json({
          error:
            'Бу филиалда ходимлар ёки мурожаатлар мавжуд. Уни ўчириб бўлмайди.',
        });
      }

      await prisma.branch.delete({
        where: {
          id: req.params.id,
        },
      });

      return res.json({
        message: 'Филиал ўчирилди',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;