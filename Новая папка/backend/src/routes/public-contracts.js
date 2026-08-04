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
        error: 'Шартномани тасдиқлаш учун розилик белгиланиши шарт',
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

    const result = await prisma.$transaction(async (tx) => {
      const invitationUpdate = await tx.invitation.updateMany({
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

      if (invitationUpdate.count !== 1) {
        const error = new Error(
          'QR-код ишлатилган ёки амал қилиш муддати тугаган'
        );
        error.status = 409;
        throw error;
      }

      const signedContract = await tx.contract.update({
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
          note: `${contract.displayId} шартномаси мижоз томонидан QR орқали тасдиқланди`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: null,
          entityType: 'Contract',
          entityId: contract.id,
          action: 'CONTRACT_CONFIRMED_BY_QR',
          metadata: {
            invitationId: invitation.id,
            caseId: caseItem.id,
            confirmedAt: now.toISOString(),
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
            method: 'ONE_TIME_QR',
            accepted: true,
          },
        },
      });

      return signedContract;
    });

    let finalization = null;
    let pdfError = null;

    try {
      finalization = await finalizeSignedContract({
        contractId: result.id,
        confirmation: {
          invitationId: invitation.id,
          signedAt: result.signedAt,
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || null,
        },
      });
    } catch (error) {
      pdfError = error.message;

      console.error(
        'Шартнома тасдиқланди, лекин PDF тайёрлашда хато:',
        error
      );

      await prisma.auditLog.create({
        data: {
          userId: null,
          entityType: 'Contract',
          entityId: result.id,
          action: 'CONTRACT_PDF_GENERATION_FAILED',
          metadata: {
            caseId: caseItem.id,
            invitationId: invitation.id,
            error: error.message,
          },
        },
      });
    }

    return res.json({
      message: 'Шартнома муваффақиятли тасдиқланди',
      item: {
        id: result.id,
        displayId: result.displayId,
        status: result.status,
        signedAt: result.signedAt,
        pdfUrl: finalization?.pdfUrl || null,
        pdfPending: !finalization?.pdfUrl,
        pdfError,
        telegram: finalization?.telegram || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
