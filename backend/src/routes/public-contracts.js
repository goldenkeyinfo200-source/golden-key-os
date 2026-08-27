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

const confirmSchema = z.object({
  accepted: z.literal(true),
});

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


function signerLabel(role, serviceType = null) {
  if (role === 'SELLER') return 'Сотувчи';
  if (role === 'BUYER') return 'Олувчи';
  if (serviceType === 'INVESTOR_PARTNERSHIP') return 'Инвестор';
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

function publicServiceLabel(serviceType) {
  const labels = {
    PRIMARY_MORTGAGE: 'Бирламчи ипотека',
    SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
    MICROLOAN: 'Микроқарз',
    REALTOR_SERVICE: 'Риэлторлик хизмати',
    SALE_PURCHASE: 'Кўчмас мулк олди-сотдиси ва риэлторлик хизмати',
    CADASTRE_SERVICE: 'Кадастр хизмати',
    INVESTOR_PARTNERSHIP: 'Инвестор билан ҳамкорлик шартномаси',
    OTHER: 'Бошқа хизмат',
  };

  return labels[serviceType] || serviceType || 'Номаълум';
}

function formatPublicDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

function escapePublicHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wantsJson(req) {
  const format = String(req.query?.format || '').toLowerCase();

  if (format === 'json') return true;

  const accept = String(req.headers.accept || '').toLowerCase();

  return (
    accept.includes('application/json') &&
    !accept.includes('text/html')
  );
}

function renderVerificationHtml(item) {
  const valid = Boolean(item?.valid);
  const fullyConfirmed = Boolean(item?.fullyConfirmed);
  const signed = item?.status === 'SIGNED';
  const success = valid && fullyConfirmed && signed;

  const statusClass = success ? 'success' : 'warning';

  const statusTitle = success
    ? 'ШАРТНОМА ҲАҚИҚИЙ'
    : valid
      ? 'ШАРТНОМА РЕЕСТРДА МАВЖУД'
      : 'ШАРТНОМА ТОПИЛМАДИ';

  const statusText = success
    ? 'Golden Key OS электрон реестрида шартнома ҳақиқий ва тўлиқ тасдиқланган.'
    : item?.registryMessage ||
      'Шартнома ҳолатини текшириш якунланди.';

  const confirmationRows = (item?.confirmations || [])
    .map(
      (confirmation) => `
        <div class="confirmation-row">
          <span>${escapePublicHtml(
            confirmation.label ||
              confirmation.role ||
              'Тасдиқловчи'
          )}</span>
          <strong>
            ${
              confirmation.confirmed
                ? '✓ Тасдиқланган'
                : 'Кутилмоқда'
            }
          </strong>
          <small>
            ${escapePublicHtml(
              formatPublicDateTime(
                confirmation.confirmedAt
              )
            )}
          </small>
        </div>
      `
    )
    .join('');

  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <meta
    name="robots"
    content="noindex,nofollow"
  />
  <title>
    ${escapePublicHtml(
      item?.contractDisplayId ||
        'Шартномани текшириш'
    )} · Golden Key OS
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f4f6f8;
      color: #171717;
    }

    .wrap {
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 38px 16px;
    }

    .card {
      width: 100%;
      max-width: 760px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,.10);
      overflow: hidden;
      border: 1px solid #ececec;
    }

    .topline {
      height: 5px;
      background: #e30613;
    }

    .content {
      padding: 30px;
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .brand-name {
      font-weight: 800;
      font-size: 19px;
      letter-spacing: .2px;
    }

    .brand-name span {
      color: #e30613;
    }

    .badge {
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      background: #f5f5f5;
      color: #555;
    }

    .verify-box {
      text-align: center;
      border-radius: 16px;
      padding: 26px 20px;
      margin-bottom: 24px;
      border: 1px solid;
    }

    .verify-box.success {
      background: #eefaf3;
      border-color: #9bd5b4;
      color: #087742;
    }

    .verify-box.warning {
      background: #fff8e8;
      border-color: #e7c97b;
      color: #8a5a00;
    }

    .icon {
      width: 58px;
      height: 58px;
      margin: 0 auto 12px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 30px;
      font-weight: 900;
      background: rgba(255,255,255,.75);
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 1.2;
    }

    .verify-box p {
      margin: 0;
      color: #333;
      line-height: 1.55;
      font-size: 14px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 18px;
    }

    .item {
      background: #f8f9fb;
      border: 1px solid #eceff2;
      border-radius: 12px;
      padding: 14px;
      min-width: 0;
    }

    .item.full {
      grid-column: 1 / -1;
    }

    .item label {
      display: block;
      font-size: 11px;
      color: #777;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .35px;
    }

    .item strong {
      display: block;
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .section-title {
      margin: 24px 0 10px;
      font-size: 15px;
      font-weight: 800;
    }

    .confirmation-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      align-items: center;
      padding: 12px 14px;
      border: 1px solid #e8ebee;
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .confirmation-row strong {
      color: #087742;
      font-size: 13px;
    }

    .confirmation-row small {
      grid-column: 1 / -1;
      color: #777;
    }

    .hash {
      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Consolas,
        monospace;
      font-size: 11px !important;
      word-break: break-all;
    }

    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #ececec;
      color: #777;
      font-size: 12px;
      line-height: 1.55;
      text-align: center;
    }

    @media (max-width: 620px) {
      .content {
        padding: 22px 16px;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .item.full {
        grid-column: auto;
      }

      h1 {
        font-size: 21px;
      }

      .brand {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>

<body>
  <main class="wrap">
    <section class="card">
      <div class="topline"></div>

      <div class="content">
        <div class="brand">
          <div class="brand-name">
            <span>GOLDEN KEY</span> INFO · Golden Key OS
          </div>
          <div class="badge">
            Электрон реестр
          </div>
        </div>

        <div class="verify-box ${statusClass}">
          <div class="icon">
            ${success ? '✓' : '!'}
          </div>

          <h1>${statusTitle}</h1>

          <p>
            ${escapePublicHtml(statusText)}
          </p>
        </div>

        <div class="grid">
          <div class="item">
            <label>Шартнома рақами</label>
            <strong>
              ${escapePublicHtml(
                item?.contractDisplayId || '—'
              )}
            </strong>
          </div>

          <div class="item">
            <label>Мурожаат рақами</label>
            <strong>
              ${escapePublicHtml(
                item?.caseDisplayId || '—'
              )}
            </strong>
          </div>

          <div class="item full">
            <label>Шартнома тури</label>
            <strong>
              ${escapePublicHtml(
                publicServiceLabel(
                  item?.serviceType
                )
              )}
            </strong>
          </div>

          <div class="item">
            <label>Ҳолати</label>
            <strong>
              ${escapePublicHtml(
                item?.statusLabel ||
                  item?.status ||
                  '—'
              )}
            </strong>
          </div>

          <div class="item">
            <label>Тасдиқланган сана</label>
            <strong>
              ${escapePublicHtml(
                formatPublicDateTime(
                  item?.signedAt
                )
              )}
            </strong>
          </div>

          <div class="item">
            <label>Тасдиқлар</label>
            <strong>
              ${escapePublicHtml(
                `${
                  item?.confirmationCount ?? 0
                } / ${
                  item?.requiredConfirmationCount ?? 0
                }`
              )}
            </strong>
          </div>

          <div class="item">
            <label>PDF ҳолати</label>
            <strong>
              ${
                item?.pdfGenerated
                  ? '✓ Яратилган'
                  : 'Ҳали яратилмаган'
              }
            </strong>
          </div>

          ${
            item?.verificationHash
              ? `
                <div class="item full">
                  <label>
                    SHA-256 текширув идентификатори
                  </label>
                  <strong class="hash">
                    ${escapePublicHtml(
                      item.verificationHash
                    )}
                  </strong>
                </div>
              `
              : ''
          }
        </div>

        ${
          confirmationRows
            ? `
              <div class="section-title">
                Электрон тасдиқлар
              </div>
              ${confirmationRows}
            `
            : ''
        }

        <div class="footer">
          Ушбу саҳифа Golden Key OS электрон
          реестридаги шартнома қайдини кўрсатади.
          <br/>
          Шахсий маълумотлар хавфсизлиги учун
          паспорт, ЖШШИР, телефон, манзил ва IP
          маълумотлари очиқ саҳифада кўрсатилмайди.
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function confirmationForRole(
  invitations,
  role,
  serviceType = null
) {
  const matches = invitations
    .filter((item) => item.signerRole === role && item.usedAt)
    .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

  const item = matches[0] || null;

  return {
    role,
    label: signerLabel(role, serviceType),
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
 *
 * QR-код орқали шартноманинг Golden Key OS'даги қайдини текшириш учун.
 * Бу endpoint очиқ, шу сабаб ЖШШИР, паспорт, телефон, манзил, IP каби
 * шахсий/техник маълумотлар қайтарилмайди.
 */
router.get('/contracts/:displayId/verify', async (req, res, next) => {
  try {
    const displayId = String(req.params.displayId || '').trim();

    if (!displayId) {
      if (wantsJson(req)) {
        return res.status(400).json({
          valid: false,
          error: 'Шартнома рақами киритилмаган',
        });
      }

      return res
        .status(400)
        .type('html')
        .send(
          renderVerificationHtml({
            valid: false,
            registryMessage:
              'Шартнома рақами киритилмаган.',
          })
        );
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
      if (wantsJson(req)) {
        return res.status(404).json({
          valid: false,
          error:
            'Бундай рақамли шартнома Golden Key OS тизимида топилмади',
        });
      }

      return res
        .status(404)
        .type('html')
        .send(
          renderVerificationHtml({
            valid: false,
            contractDisplayId: displayId,
            registryMessage:
              'Бундай рақамли шартнома Golden Key OS тизимида топилмади.',
          })
        );
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
        confirmationForRole(
          contract.invitations,
          'BUYER',
          contract.case?.serviceType
        ),
        confirmationForRole(
          contract.invitations,
          'SELLER',
          contract.case?.serviceType
        ),
      ];
    } else {
      confirmations = [
        confirmationForRole(
          contract.invitations,
          'CLIENT',
          contract.case?.serviceType
        ),
      ];
    }

    const confirmationCount =
      confirmations.filter((item) => item.confirmed).length;

    const requiredConfirmationCount =
      isSalePurchase ? 2 : 1;

    const fullyConfirmed =
      contract.status === 'SIGNED' &&
      confirmationCount >= requiredConfirmationCount;

    const item = {
      valid: true,
      contractDisplayId: contract.displayId,
      caseDisplayId:
        contract.case?.displayId || null,
      serviceType:
        contract.case?.serviceType || null,
      status: contract.status,
      statusLabel:
        publicStatusLabel(contract.status),
      createdAt: contract.createdAt,
      signedAt: contract.signedAt,
      fullyConfirmed,
      confirmationCount,
      requiredConfirmationCount,
      confirmations,
      verificationHash,
      pdfGenerated: Boolean(contract.pdfUrl),
      pdfGeneratedAt:
        pdfAudit?.createdAt || null,
      registryMessage: fullyConfirmed
        ? 'Ҳужжат Golden Key OS электрон архивида тўлиқ тасдиқланган ҳолда қайд этилган.'
        : 'Ҳужжат Golden Key OS тизимида мавжуд, аммо тасдиқлаш жараёни якунланмаган.',
    };

    if (wantsJson(req)) {
      return res.json({
        valid: true,
        item: {
          contractDisplayId:
            item.contractDisplayId,
          caseDisplayId:
            item.caseDisplayId,
          serviceType:
            item.serviceType,
          status:
            item.status,
          statusLabel:
            item.statusLabel,
          createdAt:
            item.createdAt,
          signedAt:
            item.signedAt,
          fullyConfirmed:
            item.fullyConfirmed,
          confirmationCount:
            item.confirmationCount,
          requiredConfirmationCount:
            item.requiredConfirmationCount,
          confirmations:
            item.confirmations,
          verificationHash:
            item.verificationHash,
          pdfGenerated:
            item.pdfGenerated,
          pdfGeneratedAt:
            item.pdfGeneratedAt,
          registryMessage:
            item.registryMessage,
        },
      });
    }

    return res
      .status(200)
      .type('html')
      .send(
        renderVerificationHtml(item)
      );
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
        signerLabel: signerLabel(
          invitation.signerRole || 'CLIENT',
          caseItem.serviceType
        ),
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
    if (!parsed.success) return res.status(400).json({ error: 'Шартномани тасдиқлаш учун розилик белгиланиши шарт' });

    const invitation = await findInvitation(req.params.token);
    const problem = invitationProblem(invitation);
    if (problem) return res.status(problem.status).json({ error: problem.error });

    const now = new Date();
    const contract = invitation.contract;
    const caseItem = contract.case;
    const signerRole = invitation.signerRole || 'CLIENT';

    const result = await prisma.$transaction(async (tx) => {
      const used = await tx.invitation.updateMany({
        where: { id: invitation.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (used.count !== 1) { const error = new Error('QR-код ишлатилган ёки амал қилиш муддати тугаган'); error.status = 409; throw error; }

      let shouldSign = true;
      let waitingFor = null;
      if (caseItem.serviceType === 'SALE_PURCHASE') {
        const confirmations = await tx.invitation.findMany({
          where: { contractId: contract.id, signerRole: { in: ['SELLER', 'BUYER'] }, usedAt: { not: null } },
          select: { signerRole: true, usedAt: true },
        });
        const roles = new Set(confirmations.map((x) => x.signerRole));
        shouldSign = roles.has('SELLER') && roles.has('BUYER');

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
        updatedContract = await tx.contract.update({ where: { id: contract.id }, data: { status: 'SIGNED', signedAt: now } });
        const oldStatus = caseItem.status;
        await tx.case.update({ where: { id: caseItem.id }, data: { status: 'CONTRACT_SIGNED' } });
        await tx.caseHistory.create({ data: { caseId: caseItem.id, fromStatus: oldStatus, toStatus: 'CONTRACT_SIGNED', note:
          caseItem.serviceType === 'SALE_PURCHASE'
            ? `${contract.displayId} шартномаси Сотувчи ва Олувчи томонидан QR орқали тасдиқланди`
            : caseItem.serviceType === 'INVESTOR_PARTNERSHIP'
              ? `${contract.displayId} шартномаси Инвестор томонидан QR орқали тасдиқланди`
              : `${contract.displayId} шартномаси мижоз томонидан QR орқали тасдиқланди` } });
      }

      await tx.auditLog.create({ data: { userId: null, entityType: 'Contract', entityId: contract.id, action: 'CONTRACT_CONFIRMED_BY_QR', metadata: { invitationId: invitation.id, caseId: caseItem.id, signerRole, confirmedAt: now.toISOString(), ip: getClientIp(req), userAgent: req.headers['user-agent'] || null, method: 'ONE_TIME_QR', accepted: true, fullySigned: shouldSign } } });
      return { contract: updatedContract, fullySigned: shouldSign, waitingFor };
    });

    let finalization = null;
    let pdfError = null;
    if (result.fullySigned) {
      try {
        finalization = await finalizeSignedContract({ contractId: result.contract.id, confirmation: { invitationId: invitation.id, signedAt: result.contract.signedAt, ip: getClientIp(req), userAgent: req.headers['user-agent'] || null } });
      } catch (error) { pdfError = error.message; console.error('Шартнома тасдиқланди, лекин PDF тайёрлашда хато:', error); }
    }

    return res.json({
      message: result.fullySigned ? 'Шартнома тўлиқ тасдиқланди' : `${signerRole === 'SELLER' ? 'Сотувчи' : 'Олувчи'} тасдиқлади. Иккинчи томон тасдиғи кутилмоқда.`,
      fullySigned: result.fullySigned,
      waitingFor: result.waitingFor,
      item: { id: result.contract.id, displayId: result.contract.displayId, status: result.contract.status, signedAt: result.contract.signedAt, pdfUrl: finalization?.pdfUrl || result.contract.pdfUrl || null, pdfError },
    });
  } catch (error) { next(error); }
});

export default router;
