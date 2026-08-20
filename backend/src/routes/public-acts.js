import crypto from 'node:crypto';

import { Router } from 'express';

import { prisma } from '../config/prisma.js';
import {
  generateDocumentHandoverPdf,
  generateServiceCompletionPdf,
} from '../services/act-pdf.js';
import {
  uploadStorageFile,
} from '../services/supabaseStorage.js';

const router = Router();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function layout({ title, content, button = null, danger = false }) {
  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#f4f5f7;color:#17191c;font-family:Arial,sans-serif}
    .wrap{max-width:760px;margin:0 auto;padding:24px 14px 60px}.card{background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
    .brand{font-weight:900;color:#e5232f;margin-bottom:12px}.title{font-size:23px;line-height:1.25;margin:0 0 18px}.meta{padding:14px;background:#f8f9fa;border-radius:12px;margin:14px 0}
    .meta div{margin:6px 0}.items{margin:18px 0;padding-left:22px}.items li{margin:10px 0;line-height:1.5}
    .notice{padding:14px;border-radius:12px;background:${danger ? '#fff1f2' : '#f0fbf5'};line-height:1.55;margin:18px 0}
    button{width:100%;border:0;border-radius:12px;background:#e5232f;color:#fff;font-weight:800;font-size:16px;padding:15px;cursor:pointer}
    .small{font-size:12px;color:#6f7680;line-height:1.5;margin-top:14px}
  </style>
</head>
<body><div class="wrap"><div class="card"><div class="brand">GOLDEN KEY INFO</div><h1 class="title">${escapeHtml(title)}</h1>${content}${button || ''}</div></div></body>
</html>`;
}

async function findInvitation(token) {
  const tokenHash = hashToken(token);

  return prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      case: {
        include: {
          applicant: true,
        },
      },
      documentHandover: {
        include: {
          items: {
            include: {
              documentItem: true,
            },
          },
        },
      },
      serviceCompletionAct: {
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });
}

function problem(invitation) {
  if (!invitation) return { status: 404, error: 'QR-код топилмади' };
  if (invitation.usedAt) return { status: 410, error: 'Бу QR-код аввал ишлатилган' };
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { status: 410, error: 'QR-коднинг амал қилиш муддати тугаган' };
  }

  if (
    !invitation.documentHandover &&
    !invitation.serviceCompletionAct
  ) {
    return { status: 404, error: 'Тасдиқланадиган далолатнома топилмади' };
  }

  return null;
}

function handoverContent(invitation) {
  const handover = invitation.documentHandover;
  const isReceipt = handover.type === 'RECEIPT';

  const items = handover.items
    .map(({ documentItem, quantity }) => {
      const num = [documentItem.series, documentItem.number]
        .filter(Boolean)
        .join(' ');
      return `<li><strong>${escapeHtml(documentItem.name)}</strong> — ${escapeHtml(documentItem.kind)}, ${quantity} дона${num ? `, ${escapeHtml(num)}` : ''}</li>`;
    })
    .join('');

  const statement = isReceipt
    ? '«Қуйидаги ҳужжатларни GOLDEN KEY INFO ходимига топширганимни ва рўйхат тўғри эканини тасдиқлайман.»'
    : '«Қуйидаги ҳужжатларни бут ва тўлиқ ҳолда қайтариб олганимни тасдиқлайман.»';

  return {
    title: isReceipt
      ? 'Ҳужжатларни қабул қилиш далолатномаси'
      : 'Ҳужжатларни қайтариш далолатномаси',
    html: `
      <div class="meta">
        <div><strong>Далолатнома:</strong> ${escapeHtml(handover.displayId)}</div>
        <div><strong>Мурожаат:</strong> ${escapeHtml(invitation.case.displayId)}</div>
        <div><strong>Мижоз:</strong> ${escapeHtml(invitation.case.applicant?.fullName || '—')}</div>
      </div>
      <ol class="items">${items}</ol>
      <div class="notice"><strong>${statement}</strong></div>
      <div class="small">Агар рўйхатда хато бўлса, тасдиқламасдан офис ходимига мурожаат қилинг.</div>
    `,
  };
}

function completionContent(invitation) {
  const act = invitation.serviceCompletionAct;

  const items = act.items
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong>${item.details ? ` — ${escapeHtml(item.details)}` : ''}</li>`)
    .join('');

  return {
    title: 'Бажарилган ишлар далолатномаси',
    html: `
      <div class="meta">
        <div><strong>Далолатнома:</strong> ${escapeHtml(act.displayId)}</div>
        <div><strong>Мурожаат:</strong> ${escapeHtml(invitation.case.displayId)}</div>
        <div><strong>Мижоз:</strong> ${escapeHtml(invitation.case.applicant?.fullName || '—')}</div>
        <div><strong>Хизмат йўналиши:</strong> ${escapeHtml(act.serviceDirection || act.serviceType)}</div>
      </div>
      <ol class="items">${items}</ol>
      <div class="notice"><strong>«Юқорида кўрсатилган ишлар/хизматлар бажарилганини ва далолатнома мазмуни билан танишганимни тасдиқлайман.»</strong></div>
      <div class="small">Агар бажарилган ишлар бўйича эътирозингиз бўлса, тасдиқламасдан офис ходимига мурожаат қилинг.</div>
    `,
  };
}

router.get('/:token', async (req, res, next) => {
  try {
    const invitation = await findInvitation(req.params.token);
    const issue = problem(invitation);

    if (issue) {
      return res
        .status(issue.status)
        .type('html')
        .send(layout({
          title: 'QR тасдиқ',
          danger: true,
          content: `<div class="notice">${escapeHtml(issue.error)}</div>`,
        }));
    }

    const view = invitation.documentHandover
      ? handoverContent(invitation)
      : completionContent(invitation);

    const button = `
      <form method="post" action="/api/public-acts/${encodeURIComponent(req.params.token)}/confirm">
        <button type="submit">ТАСДИҚЛАЙМАН</button>
      </form>
    `;

    return res.type('html').send(
      layout({
        title: view.title,
        content: view.html,
        button,
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post('/:token/confirm', async (req, res, next) => {
  try {
    const invitation = await findInvitation(req.params.token);
    const issue = problem(invitation);

    if (issue) {
      return res
        .status(issue.status)
        .type('html')
        .send(layout({
          title: 'QR тасдиқ',
          danger: true,
          content: `<div class="notice">${escapeHtml(issue.error)}</div>`,
        }));
    }

    const now = new Date();
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    const result = await prisma.$transaction(async (tx) => {
      const used = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (used.count !== 1) {
        const error = new Error('QR-код ишлатилган ёки амал қилиш муддати тугаган');
        error.status = 409;
        throw error;
      }

      if (invitation.documentHandover) {
        const handover = invitation.documentHandover;

        await tx.documentHandover.update({
          where: { id: handover.id },
          data: {
            status: 'SIGNED',
            confirmedAt: now,
          },
        });

        if (handover.type === 'RETURN') {
          const documentIds = handover.items.map((item) => item.documentItemId);

          await tx.clientDocumentItem.updateMany({
            where: {
              id: { in: documentIds },
              caseId: handover.caseId,
            },
            data: {
              status: 'RETURNED',
              returnedAt: now,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: null,
            entityType: 'DocumentHandover',
            entityId: handover.id,
            action:
              handover.type === 'RECEIPT'
                ? 'DOCUMENT_RECEIPT_CONFIRMED_BY_QR'
                : 'DOCUMENT_RETURN_CONFIRMED_BY_QR',
            metadata: {
              invitationId: invitation.id,
              caseId: handover.caseId,
              confirmedAt: now.toISOString(),
              ip,
              userAgent,
              method: 'ONE_TIME_QR',
            },
          },
        });

        return {
          kind: 'handover',
          id: handover.id,
        };
      }

      const act = invitation.serviceCompletionAct;

      await tx.serviceCompletionAct.update({
        where: { id: act.id },
        data: {
          status: 'SIGNED',
          confirmedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: null,
          entityType: 'ServiceCompletionAct',
          entityId: act.id,
          action: 'SERVICE_COMPLETION_CONFIRMED_BY_QR',
          metadata: {
            invitationId: invitation.id,
            caseId: act.caseId,
            confirmedAt: now.toISOString(),
            ip,
            userAgent,
            method: 'ONE_TIME_QR',
          },
        },
      });

      return {
        kind: 'completion',
        id: act.id,
      };
    });

    let pdfError = null;

    try {
      if (result.kind === 'handover') {
        const handover = await prisma.documentHandover.findUnique({
          where: { id: result.id },
          include: {
            case: {
              include: { applicant: true },
            },
            items: {
              include: { documentItem: true },
            },
          },
        });

        const pdf = await generateDocumentHandoverPdf({
          handover,
          caseItem: handover.case,
          confirmation: {
            invitationId: invitation.id,
            confirmedAt: now,
            ip,
            userAgent,
          },
        });

        const storagePath = [
          'acts',
          String(now.getFullYear()),
          handover.case.displayId,
          `${handover.displayId}.pdf`,
        ].join('/');

        await uploadStorageFile({
          storagePath,
          buffer: pdf.buffer,
          mimeType: 'application/pdf',
        });

        await prisma.documentHandover.update({
          where: { id: handover.id },
          data: { pdfUrl: storagePath },
        });
      } else {
        const act = await prisma.serviceCompletionAct.findUnique({
          where: { id: result.id },
          include: {
            case: {
              include: { applicant: true },
            },
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        const pdf = await generateServiceCompletionPdf({
          act,
          caseItem: act.case,
          confirmation: {
            invitationId: invitation.id,
            confirmedAt: now,
            ip,
            userAgent,
          },
        });

        const storagePath = [
          'acts',
          String(now.getFullYear()),
          act.case.displayId,
          `${act.displayId}.pdf`,
        ].join('/');

        await uploadStorageFile({
          storagePath,
          buffer: pdf.buffer,
          mimeType: 'application/pdf',
        });

        await prisma.serviceCompletionAct.update({
          where: { id: act.id },
          data: { pdfUrl: storagePath },
        });
      }
    } catch (error) {
      pdfError = error.message;
      console.error('Далолатнома тасдиқланди, лекин PDF яратишда хато:', error);
    }

    return res.type('html').send(
      layout({
        title: 'Тасдиқ қабул қилинди',
        content: `
          <div class="notice"><strong>✓ Ҳужжат муваффақиятли QR орқали тасдиқланди.</strong></div>
          ${pdfError ? `<div class="small">PDF тайёрлашда техник хато қайд этилди. Тасдиқнинг ўзи базага сақланди.</div>` : '<div class="small">PDF нусхаси Golden Key OS архивида сақланади.</div>'}
        `,
      })
    );
  } catch (error) {
    next(error);
  }
});

export default router;
