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

const MANAGE_OFFICE_ROLES = ['SUPER_ADMIN', 'DIRECTOR'];
const SEND_ROLES = ['SUPER_ADMIN', 'RECEPTION_MANAGER'];
const INTERNAL_VIEW_ROLES = [
  'SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'RECEPTION_MANAGER',
  'EXECUTOR', 'LAWYER',
];

const officeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  officeNumber: z.string().trim().max(100).optional().or(z.literal('')),
  licenseNumber: z.string().trim().max(100).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

const employeeSchema = z.object({
  fullName: z.string().trim().min(3).max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  login: z.string().trim().min(3).max(100),
  password: z.string().min(6).max(200).optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

const requestSchema = z.object({
  officeId: z.string().trim().min(1),
  documentIds: z.array(z.string().trim().min(1)).default([]),
  note: z.string().trim().max(2000).optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum([
    'ACCEPTED', 'IN_REVIEW', 'NEEDS_CORRECTION', 'RESUBMITTED',
    'DOCUMENTS_READY', 'READY_FOR_VISIT', 'COMPLETED', 'CANCELLED',
  ]),
  deficiencyNote: z.string().trim().max(3000).optional().nullable(),
  visitNote: z.string().trim().max(2000).optional().nullable(),
  visitAt: z.string().trim().optional().nullable(),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Фақат JPG, PNG, WEBP ёки PDF файл юклаш мумкин');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

const clean = (value) => {
  if (value === undefined || value === null) return null;
  const t = String(value).trim();
  return t || null;
};

function getExtension(file) {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (ext) return ext;
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' })[file.mimetype] || '';
}

async function nextDisplayId(tx) {
  const year = new Date().getFullYear();
  const prefix = `GK-NT-${year}-`;
  const latest = await tx.notaryRequest.findFirst({
    where: { displayId: { startsWith: prefix } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });
  const n = latest?.displayId ? Number(latest.displayId.split('-').at(-1)) : 0;
  return `${prefix}${String((Number.isFinite(n) ? n : 0) + 1).padStart(6, '0')}`;
}

async function loadRequest(id) {
  return prisma.notaryRequest.findUnique({
    where: { id },
    include: {
      case: { include: { applicant: true, branch: true, executor: { select: { id: true, fullName: true, phone: true } } } },
      office: true,
      assignedEmployee: { select: { id: true, fullName: true, phone: true } },
      documents: { include: { document: true } },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });
}

function canAccess(item, user) {
  if (!item) return false;
  if (user.role === 'NOTARY') return Boolean(user.notaryOfficeId && user.notaryOfficeId === item.officeId);
  if (['SUPER_ADMIN', 'DIRECTOR', 'LAWYER'].includes(user.role)) return true;
  if (user.role === 'BRANCH_MANAGER') return Boolean(user.branchId && user.branchId === item.case.branchId);
  if (user.role === 'RECEPTION_MANAGER') return item.case.receptionManagerId === user.id;
  if (user.role === 'EXECUTOR') return item.case.executorId === user.id;
  return false;
}

async function serialize(item) {
  return {
    ...item,
    documents: await Promise.all((item.documents || []).map(async (x) => ({
      ...x.document,
      fileUrl: await createSignedFileUrl(x.document.fileUrl),
    }))),
    files: await Promise.all((item.files || []).map(async (x) => ({
      ...x,
      fileUrl: await createSignedFileUrl(x.fileUrl),
    }))),
  };
}

router.use(auth);

/* Нотариал идоралар */
router.get('/offices', async (req, res, next) => {
  try {
    if (req.user.role === 'NOTARY') {
      const items = await prisma.notaryOffice.findMany({
        where: { id: req.user.notaryOfficeId || '__NONE__', isActive: true },
        orderBy: { name: 'asc' },
      });
      return res.json({ items });
    }
    if (!INTERNAL_VIEW_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Рухсат йўқ' });
    const items = await prisma.notaryOffice.findMany({
      where: { isActive: true },
      include: {
        employees: {
          where: { role: 'NOTARY', isActive: true },
          select: { id: true, fullName: true, phone: true, email: true, login: true, isActive: true },
          orderBy: { fullName: 'asc' },
        },
        _count: { select: { employees: true, requests: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

router.post('/offices', allowRoles(...MANAGE_OFFICE_ROLES), async (req, res, next) => {
  try {
    const parsed = officeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Нотариус маълумотларида хато бор', details: parsed.error.flatten().fieldErrors });
    const item = await prisma.notaryOffice.create({ data: {
      ...parsed.data,
      officeNumber: clean(parsed.data.officeNumber), licenseNumber: clean(parsed.data.licenseNumber),
      address: clean(parsed.data.address), phone: clean(parsed.data.phone), email: clean(parsed.data.email),
      isActive: parsed.data.isActive ?? true,
    } });
    res.status(201).json({ item });
  } catch (e) { if (e.code === 'P2002') return res.status(409).json({ error: 'Бу нотариал идора аллақачон мавжуд' }); next(e); }
});

router.patch('/offices/:officeId', allowRoles(...MANAGE_OFFICE_ROLES), async (req, res, next) => {
  try {
    const parsed = officeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Маълумотларда хато бор', details: parsed.error.flatten().fieldErrors });
    const data = {};
    for (const [k, v] of Object.entries(parsed.data)) data[k] = typeof v === 'string' ? clean(v) : v;
    const item = await prisma.notaryOffice.update({ where: { id: req.params.officeId }, data });
    res.json({ item });
  } catch (e) { next(e); }
});

router.post('/offices/:officeId/employees', allowRoles(...MANAGE_OFFICE_ROLES), async (req, res, next) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Нотариус маълумотларида хато бор', details: parsed.error.flatten().fieldErrors });
    const office = await prisma.notaryOffice.findUnique({ where: { id: req.params.officeId } });
    if (!office) return res.status(404).json({ error: 'Нотариал идора топилмади' });
    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null;
    const item = await prisma.user.create({
      data: { notaryOfficeId: office.id, fullName: parsed.data.fullName, phone: clean(parsed.data.phone), email: clean(parsed.data.email), login: parsed.data.login.toLowerCase(), passwordHash, role: 'NOTARY', isActive: parsed.data.isActive },
      select: { id: true, fullName: true, phone: true, email: true, login: true, role: true, notaryOfficeId: true, isActive: true },
    });
    res.status(201).json({ item });
  } catch (e) { if (e.code === 'P2002') return res.status(409).json({ error: 'Бу логин ёки email аллақачон мавжуд' }); next(e); }
});

/* Заявкалар */
router.get('/requests', async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'NOTARY') where.officeId = req.user.notaryOfficeId || '__NONE__';
    else if (req.user.role === 'BRANCH_MANAGER') where.case = { branchId: req.user.branchId || '__NONE__' };
    else if (req.user.role === 'RECEPTION_MANAGER') where.case = { receptionManagerId: req.user.id };
    else if (req.user.role === 'EXECUTOR') where.case = { executorId: req.user.id };
    else if (!['SUPER_ADMIN', 'DIRECTOR', 'LAWYER'].includes(req.user.role)) return res.status(403).json({ error: 'Рухсат йўқ' });

    const items = await prisma.notaryRequest.findMany({
      where,
      include: { case: { include: { applicant: true, branch: true, executor: { select: { id: true, fullName: true, phone: true } } } }, office: true, assignedEmployee: { select: { id: true, fullName: true, phone: true } }, _count: { select: { documents: true, files: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

router.get('/case/:caseId', async (req, res, next) => {
  try {
    const items = await prisma.notaryRequest.findMany({ where: { caseId: req.params.caseId }, orderBy: { createdAt: 'desc' } });
    const result = [];
    for (const row of items) {
      const full = await loadRequest(row.id);
      if (canAccess(full, req.user)) result.push(await serialize(full));
    }
    res.json({ items: result });
  } catch (e) { next(e); }
});

router.get('/requests/:requestId', async (req, res, next) => {
  try {
    const item = await loadRequest(req.params.requestId);
    if (!item) return res.status(404).json({ error: 'Нотариус заявкаси топилмади' });
    if (!canAccess(item, req.user)) return res.status(403).json({ error: 'Рухсат йўқ' });
    res.json({ item: await serialize(item) });
  } catch (e) { next(e); }
});

/* Фақат SUPER_ADMIN ёки RECEPTION_MANAGER нотариусга юборади */
router.post('/case/:caseId', allowRoles(...SEND_ROLES), async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Нотариусга юбориш маълумотларида хато бор', details: parsed.error.flatten().fieldErrors });

    const caseItem = await prisma.case.findUnique({ where: { id: req.params.caseId }, select: { id: true, displayId: true, branchId: true, receptionManagerId: true, executorId: true } });
    if (!caseItem) return res.status(404).json({ error: 'Мурожаат топилмади' });
    if (req.user.role === 'RECEPTION_MANAGER' && caseItem.receptionManagerId !== req.user.id) return res.status(403).json({ error: 'Фақат ўзингизга бириктирилган мурожаатни нотариусга юборасиз' });

    const office = await prisma.notaryOffice.findFirst({ where: { id: parsed.data.officeId, isActive: true } });
    if (!office) return res.status(404).json({ error: 'Фаол нотариал идора топилмади' });

    if (parsed.data.documentIds.length) {
      const count = await prisma.document.count({ where: { id: { in: parsed.data.documentIds }, caseId: caseItem.id } });
      if (count !== parsed.data.documentIds.length) return res.status(400).json({ error: 'Танланган ҳужжатлардан бири ушбу мурожаатга тегишли эмас' });
    }

    const created = await prisma.$transaction(async (tx) => {
      const displayId = await nextDisplayId(tx);
      const item = await tx.notaryRequest.create({
        data: { displayId, caseId: caseItem.id, officeId: office.id, status: 'SENT', note: clean(parsed.data.note), documents: { create: parsed.data.documentIds.map((documentId) => ({ documentId })) } },
      });
      await tx.auditLog.create({ data: { userId: req.user.id, entityType: 'NotaryRequest', entityId: item.id, action: 'NOTARY_REQUEST_SENT', metadata: { displayId, caseId: caseItem.id, caseDisplayId: caseItem.displayId, officeId: office.id, officeName: office.name, documentCount: parsed.data.documentIds.length } } });
      return item;
    });
    const item = await loadRequest(created.id);
    res.status(201).json({ message: `${created.displayId} нотариусга юборилди`, item: await serialize(item) });
  } catch (e) { next(e); }
});

router.patch('/requests/:requestId/status', async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Ҳолат маълумотлари нотўғри', details: parsed.error.flatten().fieldErrors });
    const item = await loadRequest(req.params.requestId);
    if (!item) return res.status(404).json({ error: 'Нотариус заявкаси топилмади' });
    if (!canAccess(item, req.user)) return res.status(403).json({ error: 'Рухсат йўқ' });

    const { status } = parsed.data;
    const notaryStatuses = ['ACCEPTED', 'IN_REVIEW', 'NEEDS_CORRECTION', 'DOCUMENTS_READY', 'READY_FOR_VISIT'];
    if (notaryStatuses.includes(status) && req.user.role !== 'NOTARY') return res.status(403).json({ error: 'Бу ҳолатни фақат нотариус белгилайди' });
    if (status === 'RESUBMITTED' && !SEND_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Қайта юборишни фақат қабул менежери ёки супер админ қилади' });
    if (status === 'COMPLETED' && !['EXECUTOR', 'SUPER_ADMIN', 'RECEPTION_MANAGER'].includes(req.user.role)) return res.status(403).json({ error: 'Ишни якунлаш ҳуқуқи йўқ' });
    if (status === 'COMPLETED' && req.user.role === 'EXECUTOR' && item.case.executorId !== req.user.id) return res.status(403).json({ error: 'Бу иш сизга бириктирилмаган' });
    if (status === 'CANCELLED' && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Фақат супер админ бекор қилади' });
    if (status === 'NEEDS_CORRECTION' && !clean(parsed.data.deficiencyNote)) return res.status(400).json({ error: 'Камчиликни ёзинг' });

    const data = { status };
    if (req.user.role === 'NOTARY') data.assignedEmployeeId = req.user.id;
    if (status === 'ACCEPTED') data.acceptedAt = new Date();
    if (status === 'IN_REVIEW') data.reviewStartedAt = new Date();
    if (status === 'NEEDS_CORRECTION') { data.deficiencyAt = new Date(); data.deficiencyNote = clean(parsed.data.deficiencyNote); }
    if (status === 'RESUBMITTED') { data.resubmittedAt = new Date(); data.deficiencyNote = null; }
    if (status === 'DOCUMENTS_READY') data.documentsReadyAt = new Date();
    if (status === 'READY_FOR_VISIT') {
      data.readyForVisitAt = new Date();
      data.visitNote = clean(parsed.data.visitNote);
      if (parsed.data.visitAt) {
        const d = new Date(parsed.data.visitAt);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Қабул вақти нотўғри' });
        data.visitAt = d;
      }
    }
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (status === 'CANCELLED') data.cancelledAt = new Date();

    const updated = await prisma.notaryRequest.update({ where: { id: item.id }, data });
    await prisma.auditLog.create({ data: { userId: req.user.id, entityType: 'NotaryRequest', entityId: item.id, action: 'NOTARY_STATUS_CHANGED', metadata: { fromStatus: item.status, toStatus: status, deficiencyNote: clean(parsed.data.deficiencyNote), visitAt: data.visitAt || null } } });
    const full = await loadRequest(updated.id);
    res.json({ message: 'Нотариус заявкаси ҳолати янгиланди', item: await serialize(full) });
  } catch (e) { next(e); }
});

router.post('/requests/:requestId/files', upload.single('file'), async (req, res, next) => {
  let storagePath = null;
  try {
    const item = await loadRequest(req.params.requestId);
    if (!item) return res.status(404).json({ error: 'Нотариус заявкаси топилмади' });
    if (!canAccess(item, req.user)) return res.status(403).json({ error: 'Рухсат йўқ' });
    if (!req.file) return res.status(400).json({ error: 'Файл танланмаган' });

    const kind = String(req.body?.kind || '').trim();
    const allowedKinds = ['SUPPORTING_DOCUMENT', 'PREPARED_DOCUMENT', 'RESULT_DOCUMENT', 'OTHER'];
    if (!allowedKinds.includes(kind)) return res.status(400).json({ error: 'Файл тури нотўғри' });
    if (req.user.role === 'NOTARY' && !['PREPARED_DOCUMENT', 'RESULT_DOCUMENT', 'OTHER'].includes(kind)) return res.status(403).json({ error: 'Нотариус бу турдаги файлни юклай олмайди' });
    if (req.user.role !== 'NOTARY' && !INTERNAL_VIEW_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Рухсат йўқ' });

    storagePath = ['notaries', item.displayId, kind.toLowerCase(), `${Date.now()}-${crypto.randomUUID()}${getExtension(req.file)}`].join('/');
    await uploadStorageFile({ storagePath, buffer: req.file.buffer, mimeType: req.file.mimetype });
    const file = await prisma.notaryFile.create({ data: { requestId: item.id, kind, fileUrl: storagePath, fileName: req.file.originalname, mimeType: req.file.mimetype, sizeBytes: req.file.size } });
    await prisma.auditLog.create({ data: { userId: req.user.id, entityType: 'NotaryFile', entityId: file.id, action: 'NOTARY_FILE_UPLOADED', metadata: { requestId: item.id, kind, fileName: req.file.originalname } } });
    res.status(201).json({ message: 'Файл юкланди', item: { ...file, fileUrl: await createSignedFileUrl(file.fileUrl) } });
  } catch (e) {
    if (storagePath) { try { await deleteStorageFile(storagePath); } catch {} }
    next(e);
  }
});

export default router;
