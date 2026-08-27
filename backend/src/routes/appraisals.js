import crypto from 'node:crypto';
import path from 'node:path';

import bcrypt from 'bcryptjs';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import { allowRoles, auth } from '../middleware/auth.js';
import {
  createSignedFileUrl,
  deleteStorageFile,
  uploadStorageFile,
} from '../services/supabaseStorage.js';

const router = Router();

const INTERNAL_ROLES = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'EXECUTOR',
  'LAWYER',
];

const MANAGE_COMPANY_ROLES = ['SUPER_ADMIN', 'DIRECTOR'];

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Фақат JPG, PNG, WEBP ёки PDF файл юклаш мумкин');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

const companySchema = z.object({
  name: z.string().trim().min(2),
  inn: z.string().trim().optional().nullable(),
  license: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
});

const employeeSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  login: z.string().trim().min(3),
  password: z.string().min(6).max(200),
});

const requestSchema = z.object({
  companyId: z.string().trim().min(1),
  documentIds: z.array(z.string().trim().min(1)).default([]),
  note: z.string().trim().max(2000).optional().nullable(),
});

const reportMetaSchema = z.object({
  appraisalValue: z.coerce.number().positive().optional().nullable(),
  reportNumber: z.string().trim().max(100).optional().nullable(),
  reportDate: z.string().trim().optional().nullable(),
});

function clean(value) {
  if (value === undefined || value === null) return null;
  const t = String(value).trim();
  return t || null;
}

function getExtension(file) {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (ext) return ext;
  return ({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  })[file.mimetype] || '';
}

async function nextDisplayId(tx) {
  const year = new Date().getFullYear();
  const prefix = `GK-AV-${year}-`;
  const latest = await tx.appraisalRequest.findFirst({
    where: { displayId: { startsWith: prefix } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });
  const n = latest?.displayId ? Number(latest.displayId.split('-').at(-1)) : 0;
  return `${prefix}${String((Number.isFinite(n) ? n : 0) + 1).padStart(6, '0')}`;
}

async function requestAccess(requestId, user) {
  const item = await prisma.appraisalRequest.findUnique({
    where: { id: requestId },
    include: {
      case: {
        include: { applicant: true, branch: true },
      },
      company: true,
      assignedEmployee: {
        select: { id: true, fullName: true, phone: true },
      },
      documents: {
        include: { document: true },
      },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!item) return { item: null, allowed: false };

  if (user.role === 'APPRAISAL_EMPLOYEE') {
    return {
      item,
      allowed: Boolean(user.appraisalCompanyId && user.appraisalCompanyId === item.companyId),
    };
  }

  if (['SUPER_ADMIN', 'DIRECTOR', 'LAWYER'].includes(user.role)) {
    return { item, allowed: true };
  }

  if (user.role === 'BRANCH_MANAGER') {
    return { item, allowed: Boolean(user.branchId && user.branchId === item.case.branchId) };
  }

  if (user.role === 'RECEPTION_MANAGER') {
    return { item, allowed: item.case.receptionManagerId === user.id };
  }

  if (user.role === 'EXECUTOR') {
    return { item, allowed: item.case.executorId === user.id };
  }

  return { item, allowed: false };
}

async function serializeRequest(item) {
  const documents = await Promise.all(
    (item.documents || []).map(async (link) => ({
      ...link.document,
      fileUrl: await createSignedFileUrl(link.document.fileUrl),
    }))
  );

  const files = await Promise.all(
    (item.files || []).map(async (file) => ({
      ...file,
      fileUrl: await createSignedFileUrl(file.fileUrl),
    }))
  );

  return { ...item, documents, files };
}

router.use(auth);

/* Companies */
router.get('/companies', async (req, res, next) => {
  try {
    if (req.user.role === 'APPRAISAL_EMPLOYEE') {
      const items = await prisma.appraisalCompany.findMany({
        where: { id: req.user.appraisalCompanyId || '__NONE__', isActive: true },
        orderBy: { name: 'asc' },
      });
      return res.json({ items });
    }

    if (!INTERNAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Рухсат йўқ' });
    }

    const items = await prisma.appraisalCompany.findMany({
      where: { isActive: true },
      include: {
        employees: {
          where: {
            role: 'APPRAISAL_EMPLOYEE',
            isActive: true,
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            login: true,
            isActive: true,
          },
          orderBy: { fullName: 'asc' },
        },
        _count: { select: { employees: true, requests: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/companies', allowRoles(...MANAGE_COMPANY_ROLES), async (req, res, next) => {
  try {
    const parsed = companySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Баҳолаш компанияси маълумотларида хато бор',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const item = await prisma.appraisalCompany.create({
      data: {
        ...parsed.data,
        inn: clean(parsed.data.inn),
        license: clean(parsed.data.license),
        address: clean(parsed.data.address),
        phone: clean(parsed.data.phone),
        email: clean(parsed.data.email),
      },
    });
    return res.status(201).json({ item });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Бу компания аллақачон мавжуд' });
    next(error);
  }
});

router.post(
  '/companies/:companyId/employees',
  allowRoles(...MANAGE_COMPANY_ROLES),
  async (req, res, next) => {
    try {
      const parsed = employeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Ходим маълумотларида хато бор',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const company = await prisma.appraisalCompany.findUnique({
        where: { id: req.params.companyId },
      });
      if (!company) return res.status(404).json({ error: 'Баҳолаш компанияси топилмади' });

      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const item = await prisma.user.create({
        data: {
          fullName: parsed.data.fullName,
          phone: clean(parsed.data.phone),
          email: clean(parsed.data.email),
          login: parsed.data.login.toLowerCase(),
          passwordHash,
          role: 'APPRAISAL_EMPLOYEE',
          appraisalCompanyId: company.id,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          login: true,
          role: true,
          appraisalCompanyId: true,
          isActive: true,
        },
      });

      return res.status(201).json({ item });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Бу логин ёки email аллақачон мавжуд' });
      }
      next(error);
    }
  }
);

/* Requests */
router.get('/requests', async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === 'APPRAISAL_EMPLOYEE') {
      if (!req.user.appraisalCompanyId) return res.json({ items: [] });
      where.companyId = req.user.appraisalCompanyId;
    } else if (req.user.role === 'BRANCH_MANAGER') {
      where.case = { branchId: req.user.branchId || '__NONE__' };
    } else if (req.user.role === 'RECEPTION_MANAGER') {
      where.case = { receptionManagerId: req.user.id };
    } else if (req.user.role === 'EXECUTOR') {
      where.case = { executorId: req.user.id };
    } else if (!['SUPER_ADMIN', 'DIRECTOR', 'LAWYER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Рухсат йўқ' });
    }

    const items = await prisma.appraisalRequest.findMany({
      where,
      include: {
        case: { include: { applicant: true, branch: true } },
        company: true,
        assignedEmployee: { select: { id: true, fullName: true, phone: true } },
        files: { orderBy: { createdAt: 'desc' } },
        _count: { select: { documents: true, files: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = await Promise.all(items.map(async (item) => ({
      ...item,
      files: await Promise.all(item.files.map(async (f) => ({
        ...f,
        fileUrl: await createSignedFileUrl(f.fileUrl),
      }))),
    })));

    return res.json({ items: serialized });
  } catch (error) {
    next(error);
  }
});

router.get('/case/:caseId', async (req, res, next) => {
  try {
    const items = await prisma.appraisalRequest.findMany({
      where: { caseId: req.params.caseId },
      include: {
        case: { include: { applicant: true, branch: true } },
        company: true,
        assignedEmployee: { select: { id: true, fullName: true, phone: true } },
        documents: { include: { document: true } },
        files: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allowedItems = [];
    for (const item of items) {
      const access = await requestAccess(item.id, req.user);
      if (access.allowed) allowedItems.push(await serializeRequest(access.item));
    }

    return res.json({ items: allowedItems });
  } catch (error) {
    next(error);
  }
});

router.get('/requests/:requestId', async (req, res, next) => {
  try {
    const access = await requestAccess(req.params.requestId, req.user);
    if (!access.item) return res.status(404).json({ error: 'Баҳолаш заявкаси топилмади' });
    if (!access.allowed) return res.status(403).json({ error: 'Рухсат йўқ' });
    return res.json({ item: await serializeRequest(access.item) });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/case/:caseId',
  allowRoles(...INTERNAL_ROLES),
  async (req, res, next) => {
    try {
      const parsed = requestSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Баҳолаш заявкаси маълумотларида хато бор',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const caseItem = await prisma.case.findUnique({
        where: { id: req.params.caseId },
        select: {
          id: true,
          displayId: true,
          branchId: true,
          receptionManagerId: true,
          executorId: true,
        },
      });
      if (!caseItem) return res.status(404).json({ error: 'Мурожаат топилмади' });

      const company = await prisma.appraisalCompany.findFirst({
        where: { id: parsed.data.companyId, isActive: true },
      });
      if (!company) return res.status(404).json({ error: 'Фаол баҳолаш компанияси топилмади' });

      if (parsed.data.documentIds.length) {
        const count = await prisma.document.count({
          where: {
            id: { in: parsed.data.documentIds },
            caseId: caseItem.id,
          },
        });
        if (count !== parsed.data.documentIds.length) {
          return res.status(400).json({ error: 'Танланган ҳужжатлардан бири ушбу мурожаатга тегишли эмас' });
        }
      }

      const item = await prisma.$transaction(async (tx) => {
        const displayId = await nextDisplayId(tx);
        const request = await tx.appraisalRequest.create({
          data: {
            displayId,
            caseId: caseItem.id,
            companyId: company.id,
            status: 'SENT',
            note: clean(parsed.data.note),
            documents: {
              create: parsed.data.documentIds.map((documentId) => ({ documentId })),
            },
          },
          include: {
            case: { include: { applicant: true, branch: true } },
            company: true,
            documents: { include: { document: true } },
            files: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'AppraisalRequest',
            entityId: request.id,
            action: 'APPRAISAL_REQUEST_SENT',
            metadata: {
              displayId,
              caseId: caseItem.id,
              caseDisplayId: caseItem.displayId,
              companyId: company.id,
              companyName: company.name,
              documentCount: parsed.data.documentIds.length,
            },
          },
        });

        return request;
      });

      return res.status(201).json({
        message: `${item.displayId} баҳолаш заявкаси юборилди`,
        item: await serializeRequest(item),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/requests/:requestId/status', async (req, res, next) => {
  try {
    const access = await requestAccess(req.params.requestId, req.user);
    if (!access.item) return res.status(404).json({ error: 'Баҳолаш заявкаси топилмади' });
    if (!access.allowed) return res.status(403).json({ error: 'Рухсат йўқ' });

    const allowed = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const status = String(req.body?.status || '').trim();
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Ҳолат нотўғри' });

    if (req.user.role === 'APPRAISAL_EMPLOYEE' && status === 'CANCELLED') {
      return res.status(403).json({ error: 'Баҳолаш компанияси заявкани бекор қила олмайди' });
    }

    const data = { status };
    if (status === 'ACCEPTED') {
      data.acceptedAt = new Date();
      if (req.user.role === 'APPRAISAL_EMPLOYEE') data.assignedEmployeeId = req.user.id;
    }
    if (status === 'IN_PROGRESS') {
      data.startedAt = new Date();
      if (req.user.role === 'APPRAISAL_EMPLOYEE') data.assignedEmployeeId = req.user.id;
    }
    if (status === 'COMPLETED') data.completedAt = new Date();

    const item = await prisma.appraisalRequest.update({
      where: { id: access.item.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        entityType: 'AppraisalRequest',
        entityId: item.id,
        action: 'APPRAISAL_STATUS_CHANGED',
        metadata: { status },
      },
    });

    return res.json({ item });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/requests/:requestId/files',
  upload.single('file'),
  async (req, res, next) => {
    let storagePath = null;
    try {
      const access = await requestAccess(req.params.requestId, req.user);
      if (!access.item) return res.status(404).json({ error: 'Баҳолаш заявкаси топилмади' });
      if (!access.allowed) return res.status(403).json({ error: 'Рухсат йўқ' });
      if (!req.file) return res.status(400).json({ error: 'Файл танланмаган' });

      const requestedKind = String(req.body?.kind || '').trim();
      let kind = requestedKind;

      if (req.user.role === 'APPRAISAL_EMPLOYEE') {
        if (kind !== 'REPORT') return res.status(403).json({ error: 'Баҳоловчи фақат ҳисобот PDF файлини юклаши мумкин' });
        if (req.file.mimetype !== 'application/pdf') {
          return res.status(400).json({ error: 'Баҳолаш ҳисоботи PDF форматда бўлиши керак' });
        }
      } else {
        if (!INTERNAL_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Рухсат йўқ' });
        if (!['PROPERTY_PHOTO', 'SUPPORTING_DOCUMENT'].includes(kind)) {
          return res.status(400).json({ error: 'Файл тури нотўғри' });
        }
      }

      const ext = getExtension(req.file);
      storagePath = [
        'appraisals',
        access.item.displayId,
        kind.toLowerCase(),
        `${Date.now()}-${crypto.randomUUID()}${ext}`,
      ].join('/');

      await uploadStorageFile({
        storagePath,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });

      const meta = kind === 'REPORT'
        ? reportMetaSchema.safeParse({
            appraisalValue: req.body.appraisalValue || null,
            reportNumber: req.body.reportNumber || null,
            reportDate: req.body.reportDate || null,
          })
        : { success: true, data: {} };

      if (!meta.success) {
        await deleteStorageFile(storagePath);
        storagePath = null;
        return res.status(400).json({
          error: 'Ҳисобот маълумотларида хато бор',
          details: meta.error.flatten().fieldErrors,
        });
      }

      const item = await prisma.$transaction(async (tx) => {
        const file = await tx.appraisalFile.create({
          data: {
            requestId: access.item.id,
            kind,
            fileUrl: storagePath,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
          },
        });

        if (kind === 'REPORT') {
          const reportDate = meta.data.reportDate ? new Date(meta.data.reportDate) : new Date();
          await tx.appraisalRequest.update({
            where: { id: access.item.id },
            data: {
              status: 'REPORT_READY',
              reportReadyAt: new Date(),
              appraisalValue: meta.data.appraisalValue || undefined,
              reportNumber: clean(meta.data.reportNumber),
              reportDate: Number.isNaN(reportDate.getTime()) ? new Date() : reportDate,
              assignedEmployeeId:
                req.user.role === 'APPRAISAL_EMPLOYEE'
                  ? req.user.id
                  : access.item.assignedEmployeeId,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            entityType: 'AppraisalFile',
            entityId: file.id,
            action: kind === 'REPORT' ? 'APPRAISAL_REPORT_UPLOADED' : 'APPRAISAL_FILE_UPLOADED',
            metadata: {
              requestId: access.item.id,
              displayId: access.item.displayId,
              kind,
              fileName: req.file.originalname,
              sizeBytes: req.file.size,
            },
          },
        });

        return file;
      });

      return res.status(201).json({
        message: kind === 'REPORT' ? 'Баҳолаш ҳисоботи юкланди' : 'Файл юкланди',
        item: { ...item, fileUrl: await createSignedFileUrl(item.fileUrl) },
      });
    } catch (error) {
      if (storagePath) {
        try { await deleteStorageFile(storagePath); } catch {}
      }
      next(error);
    }
  }
);

export default router;
