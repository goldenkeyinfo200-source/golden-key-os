import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

/* =========================================================
   VALIDATION
========================================================= */

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


const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'LAWYER',
  'ACCOUNTANT',
];

const assignStaffSchema = z.object({
  userId: z.string().trim().min(1, 'Ходим танланмаган'),
});

const setManagerSchema = z.object({
  userId: z.string().trim().min(1, 'Раҳбар танланмаган'),
});

/* =========================================================
   HELPERS
========================================================= */

function normalizeOptional(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

/*
  Филиал қайси компанияга тегишли эканини аниқлайди.

  1. Фойдаланувчида companyId бўлса — шу компания.
  2. Базада "Golden Key" номли компания бўлса — шу компания.
  3. Базада фақат битта компания бўлса — шу компания.
  4. Компания умуман бўлмаса — "Golden Key Info" автомат яратилади.
*/
async function resolveCompanyId(user) {
  /*
    Аввал user.companyId ни текширамиз.
  */
  if (user?.companyId) {
    const company = await prisma.company.findUnique({
      where: {
        id: user.companyId,
      },

      select: {
        id: true,
      },
    });

    if (company) {
      return company.id;
    }
  }

  /*
    Golden Key компаниясини номидан қидирамиз.
  */
  const goldenKeyCompany = await prisma.company.findFirst({
    where: {
      name: {
        contains: 'Golden Key',
        mode: 'insensitive',
      },
    },

    select: {
      id: true,
      name: true,
    },

    orderBy: {
      createdAt: 'asc',
    },
  });

  if (goldenKeyCompany) {
    return goldenKeyCompany.id;
  }

  /*
    Агар фақат битта компания бўлса,
    автомат шу компаниядан фойдаланамиз.
  */
  const companies = await prisma.company.findMany({
    take: 2,

    orderBy: {
      createdAt: 'asc',
    },

    select: {
      id: true,
      name: true,
    },
  });

  if (companies.length === 1) {
    return companies[0].id;
  }

  /*
    Компания умуман йўқ бўлса,
    Golden Key Info компаниясини яратамиз.
  */
  if (companies.length === 0) {
    const company = await prisma.company.create({
      data: {
        name: 'Golden Key Info',
      },

      select: {
        id: true,
      },
    });

    return company.id;
  }

  /*
    Бир нечта компания бор, аммо қайси бири
    Golden Key экани аниқ бўлмаса — автомат
    нотўғри компанияни танламаймиз.
  */
  const error = new Error(
    'Бир нечта компания мавжуд. Golden Key Info компаниясини аниқлаб бўлмади.'
  );

  error.status = 400;

  throw error;
}

/* =========================================================
   AUTH
========================================================= */

router.use(auth);

/* =========================================================
   GET /api/branches
   Филиаллар рўйхати
========================================================= */

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

      /*
        Филиал раҳбари фақат ўз филиалини кўради.
      */
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
          company: {
            select: {
              id: true,
              name: true,
            },
          },

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

        company: branch.company || null,

        name: branch.name,
        city: branch.city,
        address: branch.address,
        phone: branch.phone,

        employeesCount: branch._count.users,
        casesCount: branch._count.cases,

        manager: branch.users[0] || null,

        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      }));

      return res.json({
        items: branches,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   GET /api/branches/:id
   Битта филиал
========================================================= */

router.get(
  '/:id',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR',
    'BRANCH_MANAGER'
  ),
  async (req, res, next) => {
    try {
      /*
        Филиал раҳбари бошқа филиални оча олмайди.
      */
      if (
        req.user.role === 'BRANCH_MANAGER' &&
        req.user.branchId !== req.params.id
      ) {
        return res.status(403).json({
          error:
            'Бошқа филиал маълумотларини кўриш учун рухсатингиз йўқ',
        });
      }

      const item = await prisma.branch.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },

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

/* =========================================================
   POST /api/branches
   Янги филиал
========================================================= */

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
          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      /*
        Компанияни автомат аниқлаймиз.
      */
      const companyId = await resolveCompanyId(
        req.user
      );

      /*
        Бир хил компанияда бир хил номли филиални
        қайта-қайта яратишни текширамиз.
      */
      const duplicate = await prisma.branch.findFirst({
        where: {
          companyId,

          name: {
            equals: parsed.data.name.trim(),
            mode: 'insensitive',
          },
        },

        select: {
          id: true,
          name: true,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          error:
            'Бу номдаги филиал аллақачон мавжуд',
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

        include: {
          company: {
            select: {
              id: true,
              name: true,
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

      return res.status(201).json({
        message:
          'Филиал муваффақиятли қўшилди',

        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PATCH /api/branches/:id
   Филиални таҳрирлаш
========================================================= */

router.patch(
  '/:id',
  allowRoles(
    'SUPER_ADMIN',
    'DIRECTOR'
  ),
  async (req, res, next) => {
    try {
      const parsed = branchSchema
        .partial()
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error:
            'Филиал маълумотларида хато бор',

          details:
            parsed.error.flatten().fieldErrors,
        });
      }

      const existing =
        await prisma.branch.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!existing) {
        return res.status(404).json({
          error: 'Филиал топилмади',
        });
      }

      /*
        Агар номи ўзгарса, дубликат текширамиз.
      */
      if (
        parsed.data.name !== undefined &&
        parsed.data.name.trim() !== existing.name
      ) {
        const duplicate =
          await prisma.branch.findFirst({
            where: {
              companyId: existing.companyId,

              id: {
                not: existing.id,
              },

              name: {
                equals:
                  parsed.data.name.trim(),

                mode: 'insensitive',
              },
            },

            select: {
              id: true,
            },
          });

        if (duplicate) {
          return res.status(409).json({
            error:
              'Бу номдаги филиал аллақачон мавжуд',
          });
        }
      }

      const data = {};

      if (parsed.data.name !== undefined) {
        data.name =
          parsed.data.name.trim();
      }

      if (parsed.data.city !== undefined) {
        data.city =
          parsed.data.city.trim();
      }

      if (parsed.data.address !== undefined) {
        data.address =
          normalizeOptional(
            parsed.data.address
          );
      }

      if (parsed.data.phone !== undefined) {
        data.phone =
          normalizeOptional(
            parsed.data.phone
          );
      }

      const item =
        await prisma.branch.update({
          where: {
            id: req.params.id,
          },

          data,

          include: {
            company: {
              select: {
                id: true,
                name: true,
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

      return res.json({
        message:
          'Филиал маълумотлари янгиланди',

        item,
      });
    } catch (error) {
      next(error);
    }
  }
);


/* =========================================================
   GET /api/branches/:id/staff
========================================================= */

router.get(
  '/:id/staff',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: req.params.id },
        select: { id: true, name: true, city: true, companyId: true },
      });

      if (!branch) {
        return res.status(404).json({ error: 'Филиал топилмади' });
      }

      const [assigned, candidates] = await Promise.all([
        prisma.user.findMany({
          where: {
            branchId: branch.id,
            role: { in: STAFF_ROLES },
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            login: true,
            role: true,
            isActive: true,
            branchId: true,
          },
          orderBy: { fullName: 'asc' },
        }),
        prisma.user.findMany({
          where: {
            role: { in: STAFF_ROLES },
            isActive: true,
            OR: [{ branchId: null }, { branchId: branch.id }],
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            login: true,
            role: true,
            isActive: true,
            branchId: true,
          },
          orderBy: { fullName: 'asc' },
        }),
      ]);

      const manager =
        assigned.find(
          (item) => item.role === 'BRANCH_MANAGER' && item.isActive
        ) || null;

      return res.json({ branch, manager, assigned, candidates });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POST /api/branches/:id/staff
========================================================= */

router.post(
  '/:id/staff',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const parsed = assignStaffSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Ходим маълумоти нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const [branch, user] = await Promise.all([
        prisma.branch.findUnique({ where: { id: req.params.id } }),
        prisma.user.findUnique({ where: { id: parsed.data.userId } }),
      ]);

      if (!branch) {
        return res.status(404).json({ error: 'Филиал топилмади' });
      }

      if (!user || !STAFF_ROLES.includes(user.role)) {
        return res.status(404).json({ error: 'Ходим топилмади' });
      }

      if (user.role === 'SUPER_ADMIN') {
        return res.status(400).json({
          error: 'SUPER_ADMIN филиалга оддий ходим сифатида бириктирилмайди',
        });
      }

      if (user.branchId && user.branchId !== branch.id) {
        return res.status(409).json({
          error:
            'Ходим бошқа филиалга бириктирилган. Аввал ўша филиалдан чиқаринг.',
        });
      }

      const item = await prisma.user.update({
        where: { id: user.id },
        data: { branchId: branch.id },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          login: true,
          role: true,
          isActive: true,
          branchId: true,
        },
      });

      return res.json({
        message: 'Ходим филиалга бириктирилди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PATCH /api/branches/:id/manager
========================================================= */

router.patch(
  '/:id/manager',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const parsed = setManagerSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Раҳбар маълумоти нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const [branch, user] = await Promise.all([
        prisma.branch.findUnique({ where: { id: req.params.id } }),
        prisma.user.findUnique({ where: { id: parsed.data.userId } }),
      ]);

      if (!branch) {
        return res.status(404).json({ error: 'Филиал топилмади' });
      }

      if (!user || !STAFF_ROLES.includes(user.role) || !user.isActive) {
        return res.status(404).json({ error: 'Фаол ходим топилмади' });
      }

      if (user.role === 'SUPER_ADMIN') {
        return res.status(400).json({
          error: 'SUPER_ADMIN филиал раҳбари қилиб тайинланмайди',
        });
      }

      if (user.branchId && user.branchId !== branch.id) {
        return res.status(409).json({
          error:
            'Ходим бошқа филиалга бириктирилган. Аввал ўша филиалдан чиқаринг.',
        });
      }

      const item = await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: {
            branchId: branch.id,
            role: 'BRANCH_MANAGER',
            id: { not: user.id },
          },
          data: { role: 'RECEPTION_MANAGER' },
        });

        return tx.user.update({
          where: { id: user.id },
          data: {
            branchId: branch.id,
            role: 'BRANCH_MANAGER',
            isActive: true,
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            login: true,
            role: true,
            isActive: true,
            branchId: true,
          },
        });
      });

      return res.json({
        message: 'Филиал раҳбари тайинланди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE /api/branches/:id/staff/:userId
========================================================= */

router.delete(
  '/:id/staff/:userId',
  allowRoles('SUPER_ADMIN', 'DIRECTOR'),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.userId },
      });

      if (
        !user ||
        !STAFF_ROLES.includes(user.role) ||
        user.branchId !== req.params.id
      ) {
        return res.status(404).json({
          error: 'Ушбу филиалда бундай ходим топилмади',
        });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Ўзингизни филиалдан чиқара олмайсиз',
        });
      }

      const item = await prisma.user.update({
        where: { id: user.id },
        data: {
          branchId: null,
          role:
            user.role === 'BRANCH_MANAGER'
              ? 'RECEPTION_MANAGER'
              : user.role,
        },
        select: {
          id: true,
          fullName: true,
          role: true,
          branchId: true,
          isActive: true,
        },
      });

      return res.json({
        message: 'Ходим филиалдан чиқарилди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE /api/branches/:id
   Филиални ўчириш
========================================================= */

router.delete(
  '/:id',
  allowRoles('SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const existing =
        await prisma.branch.findUnique({
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

      /*
        Филиалда ходим ёки мурожаат бўлса
        маълумот тарихини бузмаслик учун
        ўчиришга рухсат бермаймиз.
      */
      if (
        existing._count.users > 0 ||
        existing._count.cases > 0
      ) {
        return res.status(409).json({
          error:
            'Бу филиалда ходимлар ёки мурожаатлар мавжуд. Филиални ўчириб бўлмайди.',
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