import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import {
  deleteAsset,
  getPublicIdFromUrl,
  uploadBuffer,
} from '../config/cloudinary.js';
import { allowRoles, auth } from '../middleware/auth.js';

const router = Router();

const DOCUMENT_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'BANK_EMPLOYEE',
  'LAWYER',
];

const DELETE_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

const DOCUMENT_TYPES = [
  'PASSPORT_FRONT',
  'PASSPORT_BACK',
  'PINFL',
  'CADASTRE',
  'INCOME_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'BIRTH_CERTIFICATE',
  'BANK_DOCUMENT',
  'CONTRACT',
  'OTHER',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        'Фақат JPG, PNG, WEBP ёки PDF файл юклаш мумкин'
      );
      error.status = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
});

const uploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  clientId: z.string().trim().optional().nullable(),
});

async function getCaseAccess(caseId, user) {
  const item = await prisma.case.findUnique({
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
    },
  });

  if (!item) {
    return {
      item: null,
      allowed: false,
    };
  }

  const allowed =
    ['SUPER_ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'LAWYER'].includes(user.role) ||
    item.receptionManagerId === user.id ||
    item.executorId === user.id ||
    user.role === 'BANK_EMPLOYEE' ||
    (
      user.role === 'BRANCH_MANAGER' &&
      user.branchId &&
      item.branchId === user.branchId
    );

  return {
    item,
    allowed,
  };
}

router.use(auth);

/**
 * GET /api/documents/case/:caseId
 */
router.get(
  '/case/:caseId',
  allowRoles(...DOCUMENT_ROLES),
  async (req, res, next) => {
    try {
      const access = await getCaseAccess(req.params.caseId, req.user);

      if (!access.item) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      if (!access.allowed) {
        return res.status(403).json({
          error: 'Ушбу мурожаат ҳужжатларини кўриш учун рухсатингиз йўқ',
        });
      }

      const items = await prisma.document.findMany({
        where: {
          caseId: access.item.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.json({
        items,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/documents/case/:caseId
 * multipart/form-data:
 * file
 * type
 * clientId (optional)
 */
router.post(
  '/case/:caseId',
  allowRoles(...DOCUMENT_ROLES),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Юкланадиган файл танланмаган',
        });
      }

      const parsed = uploadSchema.safeParse({
        type: req.body.type,
        clientId: req.body.clientId || null,
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Ҳужжат тури нотўғри',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const access = await getCaseAccess(req.params.caseId, req.user);

      if (!access.item) {
        return res.status(404).json({
          error: 'Мурожаат топилмади',
        });
      }

      if (!access.allowed) {
        return res.status(403).json({
          error: 'Ушбу мурожаатга ҳужжат юклаш учун рухсатингиз йўқ',
        });
      }

      const clientId =
        parsed.data.clientId || access.item.applicantClientId || null;

      const uploadResult = await uploadBuffer(req.file.buffer, {
        folder: `golden-key-os/documents/${access.item.displayId}`,
        public_id: `${parsed.data.type.toLowerCase()}-${Date.now()}`,
        resource_type: 'auto',
      });

      const item = await prisma.$transaction(async (tx) => {
        const document = await tx.document.create({
          data: {
            caseId: access.item.id,
            clientId,
            type: parsed.data.type,
            fileUrl: uploadResult.secure_url,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Document',
            entityId: document.id,
            action: 'DOCUMENT_UPLOADED',
            metadata: {
              caseId: access.item.id,
              caseDisplayId: access.item.displayId,
              type: document.type,
              fileName: document.fileName,
              publicId: uploadResult.public_id,
              resourceType: uploadResult.resource_type,
            },
          },
        });

        return document;
      });

      return res.status(201).json({
        message: 'Ҳужжат муваффақиятли юкланди',
        item,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/documents/:documentId
 */
router.delete(
  '/:documentId',
  allowRoles(...DELETE_ROLES),
  async (req, res, next) => {
    try {
      const document = await prisma.document.findUnique({
        where: {
          id: req.params.documentId,
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

      if (!document) {
        return res.status(404).json({
          error: 'Ҳужжат топилмади',
        });
      }

      const access = document.case
        ? await getCaseAccess(document.case.id, req.user)
        : { allowed: ['SUPER_ADMIN', 'DIRECTOR'].includes(req.user.role) };

      if (!access.allowed) {
        return res.status(403).json({
          error: 'Ушбу ҳужжатни ўчириш учун рухсатингиз йўқ',
        });
      }

      const publicId = getPublicIdFromUrl(document.fileUrl);
      const resourceType =
        document.mimeType === 'application/pdf' ? 'raw' : 'image';

      if (publicId) {
        try {
          await deleteAsset(publicId, resourceType);
        } catch (cloudinaryError) {
          console.error(
            'Cloudinary файлни ўчиришда хато:',
            cloudinaryError
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'Document',
            entityId: document.id,
            action: 'DOCUMENT_DELETED',
            metadata: {
              caseId: document.caseId,
              type: document.type,
              fileName: document.fileName,
              fileUrl: document.fileUrl,
            },
          },
        });

        await tx.document.delete({
          where: {
            id: document.id,
          },
        });
      });

      return res.json({
        message: 'Ҳужжат муваффақиятли ўчирилди',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
