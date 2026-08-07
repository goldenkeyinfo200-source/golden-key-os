import crypto from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

const MANAGE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

const createSchema = z.object({
  branchId: z.string().trim().min(1),
  managerId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(100),
  deviceCode: z.string().trim().min(2).max(100).optional(),
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeDeviceCode() {
  return `GK-KIOSK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function clearDisplayData() {
  return {
    currentContractId: null,
    currentQrDataUrl: null,
    currentSignUrl: null,
    qrExpiresAt: null,
    displayStatus: 'IDLE',
  };
}

/* =========================================================
   PUBLIC KIOSK DISPLAY
   GET /api/kiosks/display/:deviceCode?token=...
========================================================= */

router.get('/display/:deviceCode', async (req, res, next) => {
  try {
    const token = String(req.query.token || '').trim();

    if (!token) {
      return res.status(401).json({
        error: 'Қурилма токени керак',
      });
    }

    const kiosk = await prisma.kioskDevice.findUnique({
      where: {
        deviceCode: req.params.deviceCode,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!kiosk || kiosk.authTokenHash !== hashToken(token)) {
      return res.status(401).json({
        error: 'QR экран қурилмаси аниқланмади',
      });
    }

    let displayStatus = kiosk.displayStatus;

    if (
      displayStatus === 'QR_READY' &&
      kiosk.qrExpiresAt &&
      kiosk.qrExpiresAt.getTime() <= Date.now()
    ) {
      await prisma.kioskDevice.update({
        where: {
          id: kiosk.id,
        },
        data: {
          ...clearDisplayData(),
          displayStatus: 'EXPIRED',
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });

      displayStatus = 'EXPIRED';
    } else {
      await prisma.kioskDevice.update({
        where: {
          id: kiosk.id,
        },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });
    }

    let contractDisplayId = null;

    if (kiosk.currentContractId) {
      const contract = await prisma.contract.findUnique({
        where: {
          id: kiosk.currentContractId,
        },
        select: {
          displayId: true,
          status: true,
        },
      });

      contractDisplayId = contract?.displayId || null;

      if (contract?.status === 'SIGNED' && displayStatus !== 'SIGNED') {
        await prisma.kioskDevice.update({
          where: {
            id: kiosk.id,
          },
          data: {
            displayStatus: 'SIGNED',
            currentQrDataUrl: null,
            currentSignUrl: null,
            qrExpiresAt: null,
            isOnline: true,
            lastSeenAt: new Date(),
          },
        });

        displayStatus = 'SIGNED';
      }
    }

    return res.json({
      ok: true,
      kiosk: {
        id: kiosk.id,
        name: kiosk.name,
        deviceCode: kiosk.deviceCode,
        branch: kiosk.branch,
        manager: kiosk.manager,
      },
      display: {
        status: displayStatus,
        contractId: kiosk.currentContractId,
        contractDisplayId,
        qrDataUrl: displayStatus === 'QR_READY' ? kiosk.currentQrDataUrl : null,
        signUrl: displayStatus === 'QR_READY' ? kiosk.currentSignUrl : null,
        expiresAt: displayStatus === 'QR_READY' ? kiosk.qrExpiresAt : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   AUTHENTICATED ADMIN / MANAGER ROUTES
========================================================= */

router.use(auth);

router.get('/', allowRoles(...MANAGE_ROLES), async (req, res, next) => {
  try {
    const where = {};

    if (
      !['SUPER_ADMIN', 'DIRECTOR'].includes(req.user.role) &&
      req.user.branchId
    ) {
      where.branchId = req.user.branchId;
    }

    const items = await prisma.kioskDevice.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        {
          branchId: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });

    return res.json({
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', allowRoles(...MANAGE_ROLES), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({
        error: 'QR экран маълумотлари нотўғри',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    if (
      !['SUPER_ADMIN', 'DIRECTOR'].includes(req.user.role) &&
      req.user.branchId &&
      parsed.data.branchId !== req.user.branchId
    ) {
      return res.status(403).json({
        error: 'Бошқа филиалга QR экран қўшиш мумкин эмас',
      });
    }

    const branch = await prisma.branch.findUnique({
      where: {
        id: parsed.data.branchId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      return res.status(404).json({
        error: 'Филиал топилмади',
      });
    }

    if (parsed.data.managerId) {
      const manager = await prisma.user.findUnique({
        where: {
          id: parsed.data.managerId,
        },
        select: {
          id: true,
          branchId: true,
        },
      });

      if (!manager) {
        return res.status(404).json({
          error: 'Оператор топилмади',
        });
      }

      if (manager.branchId && manager.branchId !== parsed.data.branchId) {
        return res.status(400).json({
          error: 'Оператор бошқа филиалга бириктирилган',
        });
      }
    }

    const deviceCode = parsed.data.deviceCode || makeDeviceCode();
    const deviceToken = crypto.randomBytes(32).toString('hex');

    const item = await prisma.kioskDevice.create({
      data: {
        branchId: parsed.data.branchId,
        managerId: parsed.data.managerId || null,
        deviceCode,
        name: parsed.data.name,
        authTokenHash: hashToken(deviceToken),
        displayStatus: 'IDLE',
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'QR экран қурилмаси яратилди',
      item,
      deviceToken,
      displayPath: `/kiosk/${encodeURIComponent(deviceCode)}?token=${encodeURIComponent(deviceToken)}`,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:kioskId/clear', allowRoles(...MANAGE_ROLES), async (req, res, next) => {
  try {
    const kiosk = await prisma.kioskDevice.findUnique({
      where: {
        id: req.params.kioskId,
      },
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'QR экран қурилмаси топилмади',
      });
    }

    if (
      !['SUPER_ADMIN', 'DIRECTOR'].includes(req.user.role) &&
      req.user.branchId &&
      kiosk.branchId !== req.user.branchId
    ) {
      return res.status(403).json({
        error: 'Ушбу QR экранни бошқаришга рухсат йўқ',
      });
    }

    const item = await prisma.kioskDevice.update({
      where: {
        id: kiosk.id,
      },
      data: clearDisplayData(),
    });

    return res.json({
      message: 'QR экран тозаланди',
      item,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
