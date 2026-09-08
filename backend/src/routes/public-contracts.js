import crypto from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma.js';
import {
  buildContractContext,
  renderContractHtml,
} from '../services/contract-template.js';
import { finalizeSignedContract } from '../services/contract-finalize.js';

const router = Router();

const signatureDataUrlSchema = z
  .string()
  .min(100, 'Имзо киритилмаган')
  .max(350000, 'Имзо ҳажми жуда катта')
  .regex(
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/,
    'Имзо формати нотўғри'
  );

const confirmSchema = z.object({
  accepted: z.literal(true),
  signatureDataUrl: signatureDataUrlSchema,
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashSignature(dataUrl) {
  return crypto.createHash('sha256').update(dataUrl).digest('hex');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function signerLabel(role) {
  if (role === 'SELLER') return 'Сотувчи';
  if (role === 'BUYER') return 'Харидор';
  return 'Мижоз';
}

function publicStatusLabel(status) {
  const labels = {
    DRAFT: 'Лойиҳа',
    READY_TO_SIGN: 'Тасдиқ кутилмоқда',
    SIGNED: 'Тўлиқ тасдиқланган',
    CANCELLED: 'Бекор қилинган',
  };

  return labels[status] || status || 'Номаълум';
}


function publicServiceTypeLabel(serviceType) {
  const labels = {
    PRIMARY_MORTGAGE: 'Бирламчи ипотека',
    SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
    MICROLOAN: 'Микроқарз',
    REALTOR_SERVICE: 'Риэлторлик хизмати',
    SALE_PURCHASE: 'Олди-сотди',
    CADASTRE_SERVICE: 'Кадастр хизмати',
    INVESTOR_PARTNERSHIP: 'Инвестор билан ҳамкорлик',
    OTHER: 'Бошқа',
  };

  return labels[serviceType] || serviceType || '—';
}

function escapePublicHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPublicDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

function renderVerificationPage(item) {
  const ok = Boolean(item.fullyConfirmed);

  const statusTitle = ok
    ? 'ШАРТНОМА ҲАҚИҚИЙ'
    : 'ШАРТНОМА ТОПИЛДИ';

  const statusText = ok
    ? 'Golden Key OS электрон реестрида тўлиқ тасдиқланган'
    : 'Ҳужжат реестрда мавжуд, аммо тасдиқлаш жараёни якунланмаган';

  const statusClass = ok ? 'ok' : 'warn';

  const confirmationsHtml = (item.confirmations || [])
    .map((confirmation) => `
      <div class="confirm-row">
        <span>${escapePublicHtml(confirmation.label)}</span>
        <strong>${confirmation.confirmed ? 'Тасдиқланган' : 'Кутилмоқда'}</strong>
      </div>
    `)
    .join('');

  return `<!doctype html>
<html lang="uz-Cyrl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapePublicHtml(item.contractDisplayId)} — Golden Key OS</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f5f6f8;
      color: #171717;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    .wrap {
      width: min(720px, calc(100% - 28px));
      margin: 28px auto;
    }
    .card {
      background: #fff;
      border: 1px solid #e7e7e7;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,.06);
    }
    .brand {
      padding: 22px 24px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: #d71920;
    }
    .brand-sub {
      margin-top: 3px;
      color: #777;
      font-size: 12px;
    }
    .status {
      padding: 30px 24px 24px;
      text-align: center;
    }
    .icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      margin: 0 auto 16px;
      font-size: 36px;
      font-weight: 800;
    }
    .ok .icon {
      background: #eaf8ef;
      color: #128447;
    }
    .warn .icon {
      background: #fff6dd;
      color: #9b6a00;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.2;
    }
    .status p {
      margin: 9px 0 0;
      color: #666;
      font-size: 14px;
    }
    .details {
      padding: 0 24px 24px;
    }
    .row {
      display: grid;
      grid-template-columns: 42% 58%;
      gap: 12px;
      padding: 13px 0;
      border-bottom: 1px solid #eee;
    }
    .row span {
      color: #777;
      font-size: 14px;
    }
    .row strong {
      text-align: right;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .confirm-box {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid #e6e6e6;
      border-radius: 12px;
      background: #fafafa;
    }
    .confirm-title {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .confirm-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 7px 0;
      font-size: 13px;
    }
    .registry {
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #f2f7ff;
      color: #355070;
      font-size: 13px;
    }
    .hash {
      margin-top: 14px;
      color: #8a8a8a;
      font-size: 10px;
      overflow-wrap: anywhere;
    }
    .footer {
      padding: 18px 24px 22px;
      border-top: 1px solid #eee;
      color: #777;
      font-size: 12px;
      text-align: center;
    }
    @media (max-width: 520px) {
      .wrap { margin: 14px auto; }
      .brand { padding: 18px; }
      .status { padding: 26px 18px 20px; }
      .details { padding: 0 18px 20px; }
      .row { grid-template-columns: 1fr; gap: 4px; }
      .row strong { text-align: left; }
      h1 { font-size: 21px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <div class="brand">
        <div>
          <div class="brand-name">Golden Key Info</div>
          <div class="brand-sub">Golden Key OS электрон реестри</div>
        </div>
        <div style="font-weight:700;font-size:12px;color:#777;">ҲУЖЖАТ ТЕКШИРУВИ</div>
      </div>

      <div class="status ${statusClass}">
        <div class="icon">${ok ? '✓' : '!'}</div>
        <h1>${statusTitle}</h1>
        <p>${statusText}</p>
      </div>

      <div class="details">
        <div class="row">
          <span>Шартнома рақами</span>
          <strong>${escapePublicHtml(item.contractDisplayId)}</strong>
        </div>
        <div class="row">
          <span>Мурожаат рақами</span>
          <strong>${escapePublicHtml(item.caseDisplayId || '—')}</strong>
        </div>
        <div class="row">
          <span>Хизмат тури</span>
          <strong>${escapePublicHtml(publicServiceTypeLabel(item.serviceType))}</strong>
        </div>
        <div class="row">
          <span>Ҳолати</span>
          <strong>${escapePublicHtml(item.statusLabel)}</strong>
        </div>
        <div class="row">
          <span>Тасдиқланган сана</span>
          <strong>${escapePublicHtml(formatPublicDateTime(item.signedAt))}</strong>
        </div>
        <div class="row">
          <span>PDF ҳужжат</span>
          <strong>${item.pdfGenerated ? 'Яратилган' : 'Ҳали яратилмаган'}</strong>
        </div>

        <div class="confirm-box">
          <div class="confirm-title">Тасдиқлар</div>
          ${confirmationsHtml || '<div class="confirm-row"><span>Маълумот йўқ</span><strong>—</strong></div>'}
        </div>

        <div class="registry">${escapePublicHtml(item.registryMessage)}</div>

        ${item.verificationHash
          ? `<div class="hash"><strong>Текширув хэши (SHA-256):</strong><br>${escapePublicHtml(item.verificationHash)}</div>`
          : ''}
      </div>

      <div class="footer">
        Golden Key Info · +998 99 999 79 73 · goldenkeyinfo200@gmail.com
      </div>
    </section>
  </main>
</body>
</html>`;
}

function confirmationForRole(invitations, role) {
  const matches = invitations
    .filter((item) => item.signerRole === role && item.usedAt)
    .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

  const item = matches[0] || null;

  return {
    role,
    label: signerLabel(role),
    confirmed: Boolean(item),
    confirmedAt: item?.usedAt || null,
  };
}

async function findInvitation(token) {
  const tokenHash = hashToken(token);

  return prisma.invitation.findUnique({
    where: {
      tokenHash,
    },
    include: {
      contract: {
        include: {
          template: true,
          case: {
            include: {
              applicant: true,
              borrowers: {
                include: {
                  client: true,
                },
                orderBy: {
                  sequence: 'asc',
                },
              },
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
          },
        },
      },
    },
  });
}

function invitationProblem(invitation) {
  if (!invitation || !invitation.contract) {
    return {
      status: 404,
      error: 'QR-код топилмади',
    };
  }

  if (invitation.usedAt) {
    return {
      status: 410,
      error: 'Бу QR-код аввал ишлатилган',
    };
  }

  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return {
      status: 410,
      error: 'QR-коднинг амал қилиш муддати тугаган',
    };
  }

  if (invitation.contract.status === 'SIGNED') {
    return {
      status: 409,
      error: 'Шартнома аллақачон тасдиқланган',
    };
  }

  if (invitation.contract.status === 'CANCELLED') {
    return {
      status: 409,
      error: 'Шартнома бекор қилинган',
    };
  }

  return null;
}

/**
 * PUBLIC CONTRACT VERIFICATION
 */
router.get('/contracts/:displayId/verify', async (req, res, next) => {
  try {
    const displayId = String(req.params.displayId || '').trim();

    if (!displayId) {
      return res.status(400).json({
        valid: false,
        error: 'Шартнома рақами киритилмаган',
      });
    }

    const contract = await prisma.contract.findUnique({
      where: {
        displayId,
      },
      select: {
        id: true,
        displayId: true,
        status: true,
        signedAt: true,
        createdAt: true,
        pdfUrl: true,
        case: {
          select: {
            displayId: true,
            serviceType: true,
          },
        },
        invitations: {
          where: {
            usedAt: {
              not: null,
            },
          },
          select: {
            signerRole: true,
            usedAt: true,
          },
          orderBy: {
            usedAt: 'asc',
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({
        valid: false,
        error: 'Бундай рақамли шартнома Golden Key OS тизимида топилмади',
      });
    }

    const pdfAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'Contract',
        entityId: contract.id,
        action: 'CONTRACT_PDF_GENERATED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        metadata: true,
        createdAt: true,
      },
    });

    const verificationHash =
      pdfAudit?.metadata &&
      typeof pdfAudit.metadata === 'object' &&
      !Array.isArray(pdfAudit.metadata)
        ? pdfAudit.metadata.verificationHash || null
        : null;

    const isSalePurchase =
      contract.case?.serviceType === 'SALE_PURCHASE';

    let confirmations;

    if (isSalePurchase) {
      confirmations = [
        confirmationForRole(contract.invitations, 'BUYER'),
        confirmationForRole(contract.invitations, 'SELLER'),
      ];
    } else {
      confirmations = [
        confirmationForRole(contract.invitations, 'CLIENT'),
      ];
    }

    const confirmationCount =
      confirmations.filter((item) => item.confirmed).length;

    const requiredConfirmationCount =
      isSalePurchase ? 2 : 1;

    const fullyConfirmed =
      contract.status === 'SIGNED' &&
      confirmationCount >= requiredConfirmationCount;

    const payload = {
      valid: true,
      item: {
        contractDisplayId: contract.displayId,
        caseDisplayId: contract.case?.displayId || null,
        serviceType: contract.case?.serviceType || null,
        status: contract.status,
        statusLabel: publicStatusLabel(contract.status),
        createdAt: contract.createdAt,
        signedAt: contract.signedAt,
        fullyConfirmed,
        confirmationCount,
        requiredConfirmationCount,
        confirmations,
        verificationHash,
        pdfGenerated: Boolean(contract.pdfUrl),
        pdfGeneratedAt: pdfAudit?.createdAt || null,
        registryMessage: fullyConfirmed
          ? 'Ҳужжат Golden Key OS электрон архивида тўлиқ тасдиқланган ҳолда қайд этилган.'
          : 'Ҳужжат Golden Key OS тизимида мавжуд, аммо тасдиқлаш жараёни якунланмаган.',
      },
    };

    const acceptsHtml =
      String(req.headers.accept || '').includes('text/html');

    if (acceptsHtml) {
      return res
        .status(200)
        .type('html')
        .send(renderVerificationPage(payload.item));
    }

    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/contracts/:token', async (req, res, next) => {
  try {
    const invitation = await findInvitation(req.params.token);
    const problem = invitationProblem(invitation);

    if (problem) {
      return res.status(problem.status).json({
        error: problem.error,
      });
    }

    const contract = invitation.contract;
    const caseItem = contract.case;
    const selectedOffer = caseItem.bankOffers[0] || null;

    const context = buildContractContext({
      contract,
      caseItem,
      selectedOffer,
    });

    const html = renderContractHtml(
      contract.template.htmlBody,
      context
    );

    return res.json({
      item: {
        contractId: contract.id,
        contractDisplayId: contract.displayId,
        caseDisplayId: caseItem.displayId,
        clientFullName: caseItem.applicant.fullName,
        serviceType: caseItem.serviceType,
        expiresAt: invitation.expiresAt,
        signerRole: invitation.signerRole || 'CLIENT',
        signerLabel: signerLabel(invitation.signerRole || 'CLIENT'),
        html,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/contracts/:token/confirm', async (req, res, next) => {
  try {
    const parsed = confirmSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          parsed.error.issues?.[0]?.message ||
          'Шартномани тасдиқлаш учун розилик ва имзо талаб қилинади',
      });
    }

    const invitation = await findInvitation(req.params.token);
    const problem = invitationProblem(invitation);

    if (problem) {
      return res.status(problem.status).json({
        error: problem.error,
      });
    }

    const now = new Date();
    const contract = invitation.contract;
    const caseItem = contract.case;
    const signerRole = invitation.signerRole || 'CLIENT';
    const signatureDataUrl = parsed.data.signatureDataUrl;
    const signatureHash = hashSignature(signatureDataUrl);

    const result = await prisma.$transaction(async (tx) => {
      const used = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (used.count !== 1) {
        const error = new Error(
          'QR-код ишлатилган ёки амал қилиш муддати тугаган'
        );
        error.status = 409;
        throw error;
      }

      let shouldSign = true;
      let waitingFor = null;

      if (caseItem.serviceType === 'SALE_PURCHASE') {
        const confirmations = await tx.invitation.findMany({
          where: {
            contractId: contract.id,
            signerRole: {
              in: ['SELLER', 'BUYER'],
            },
            usedAt: {
              not: null,
            },
          },
          select: {
            signerRole: true,
            usedAt: true,
          },
        });

        const roles = new Set(
          confirmations.map((item) => item.signerRole)
        );

        shouldSign =
          roles.has('SELLER') &&
          roles.has('BUYER');

        if (shouldSign) {
          waitingFor = null;
        } else if (roles.has('SELLER')) {
          waitingFor = 'BUYER';
        } else if (roles.has('BUYER')) {
          waitingFor = 'SELLER';
        } else {
          waitingFor = 'BUYER';
        }
      }

      let updatedContract = contract;

      if (shouldSign) {
        updatedContract = await tx.contract.update({
          where: {
            id: contract.id,
          },
          data: {
            status: 'SIGNED',
            signedAt: now,
          },
        });

        const oldStatus = caseItem.status;

        await tx.case.update({
          where: {
            id: caseItem.id,
          },
          data: {
            status: 'CONTRACT_SIGNED',
          },
        });

        await tx.caseHistory.create({
          data: {
            caseId: caseItem.id,
            fromStatus: oldStatus,
            toStatus: 'CONTRACT_SIGNED',
            note:
              caseItem.serviceType === 'SALE_PURCHASE'
                ? `${contract.displayId} шартномаси Сотувчи ва Харидор томонидан QR ва экрандаги қўл имзоси орқали тасдиқланди`
                : `${contract.displayId} шартномаси мижоз томонидан QR ва экрандаги қўл имзоси орқали тасдиқланди`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: null,
          entityType: 'Contract',
          entityId: contract.id,
          action: 'CONTRACT_CONFIRMED_BY_QR',
          metadata: {
            invitationId: invitation.id,
            caseId: caseItem.id,
            signerRole,
            confirmedAt: now.toISOString(),
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
            method: 'ONE_TIME_QR_WITH_HANDWRITTEN_SIGNATURE',
            accepted: true,
            signatureDataUrl,
            signatureHash,
            fullySigned: shouldSign,
          },
        },
      });

      return {
        contract: updatedContract,
        fullySigned: shouldSign,
        waitingFor,
      };
    });

    let finalization = null;
    let pdfError = null;

    if (result.fullySigned) {
      try {
        finalization = await finalizeSignedContract({
          contractId: result.contract.id,
          confirmation: {
            invitationId: invitation.id,
            signerRole,
            signedAt: result.contract.signedAt,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
            signatureDataUrl,
            signatureHash,
          },
        });
      } catch (error) {
        pdfError = error.message;
        console.error(
          'Шартнома тасдиқланди, лекин PDF тайёрлашда хато:',
          error
        );
      }
    }

    return res.json({
      message: result.fullySigned
        ? 'Шартнома имзо билан тўлиқ тасдиқланди'
        : `${
            signerRole === 'SELLER' ? 'Сотувчи' : 'Харидор'
          } имзо қўйди. Иккинчи томон тасдиғи кутилмоқда.`,
      fullySigned: result.fullySigned,
      waitingFor: result.waitingFor,
      item: {
        id: result.contract.id,
        displayId: result.contract.displayId,
        status: result.contract.status,
        signedAt: result.contract.signedAt,
        pdfUrl:
          finalization?.pdfUrl ||
          result.contract.pdfUrl ||
          null,
        pdfError,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
