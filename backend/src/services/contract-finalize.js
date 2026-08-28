import { prisma } from '../config/prisma.js';
import {
  createSignedFileUrl,
  uploadStorageFile,
} from './supabaseStorage.js';
import { generateContractPdf } from './contract-pdf.js';
import { sendContractPdfToClient } from './telegram.js';

function safeFileName(displayId) {
  return `${String(displayId).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
}

function confirmationLabel(role) {
  if (role === 'SELLER') return 'Сотувчи';
  if (role === 'BUYER') return 'Олувчи';
  return 'Мижоз';
}

function jsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

async function loadContractConfirmations({
  contract,
  fallbackConfirmation,
}) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'Contract',
      entityId: contract.id,
      action: 'CONTRACT_CONFIRMED_BY_QR',
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      metadata: true,
      createdAt: true,
    },
  });

  const byRole = new Map();

  for (const log of logs) {
    const metadata = jsonObject(log.metadata);
    const role = metadata.signerRole || 'CLIENT';

    byRole.set(role, {
      role,
      label: confirmationLabel(role),
      invitationId: metadata.invitationId || null,
      signedAt: metadata.confirmedAt || log.createdAt,
      ip: metadata.ip || null,
      userAgent: metadata.userAgent || null,
      method: metadata.method || 'ONE_TIME_QR',
      accepted: metadata.accepted === true,
      signatureDataUrl: metadata.signatureDataUrl || null,
      signatureHash: metadata.signatureHash || null,
    });
  }

  const requiredRoles =
    contract.case.serviceType === 'SALE_PURCHASE'
      ? ['BUYER', 'SELLER']
      : ['CLIENT'];

  const confirmations = requiredRoles
    .map((role) => byRole.get(role))
    .filter(Boolean);

  if (confirmations.length === requiredRoles.length) {
    return confirmations;
  }

  if (fallbackConfirmation) {
    const fallbackRole =
      contract.case.serviceType === 'SALE_PURCHASE'
        ? fallbackConfirmation.signerRole || null
        : 'CLIENT';

    if (fallbackRole && !byRole.has(fallbackRole)) {
      byRole.set(fallbackRole, {
        role: fallbackRole,
        label: confirmationLabel(fallbackRole),
        invitationId: fallbackConfirmation.invitationId || null,
        signedAt:
          fallbackConfirmation.signedAt ||
          contract.signedAt,
        ip: fallbackConfirmation.ip || null,
        userAgent:
          fallbackConfirmation.userAgent || null,
        method:
          fallbackConfirmation.method ||
          'ONE_TIME_QR_WITH_HANDWRITTEN_SIGNATURE',
        accepted: true,
        signatureDataUrl:
          fallbackConfirmation.signatureDataUrl || null,
        signatureHash:
          fallbackConfirmation.signatureHash || null,
      });
    }
  }

  return requiredRoles
    .map((role) => byRole.get(role))
    .filter(Boolean);
}

export async function finalizeSignedContract({
  contractId,
  confirmation,
}) {
  const contract = await prisma.contract.findUnique({
    where: {
      id: contractId,
    },
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
  });

  if (!contract) {
    const error = new Error(
      'PDF яратиш учун шартнома топилмади'
    );
    error.status = 404;
    throw error;
  }

  if (
    contract.status !== 'SIGNED' ||
    !contract.signedAt
  ) {
    const error = new Error(
      'PDF фақат тасдиқланган шартнома учун яратилади'
    );
    error.status = 409;
    throw error;
  }

  /*
    Муҳим:
    Имзо қўшилганидан кейин PDF қайта генерация қилиниши мумкин.
    Шунинг учун аввалги "pdfUrl бўлса return" оптимизациясини
    ишлатмаймиз. uploadStorageFile upsert:true бўлиши керак.
  */

  const selectedOffer =
    contract.case.bankOffers[0] || null;

  const confirmations =
    await loadContractConfirmations({
      contract,
      fallbackConfirmation: confirmation,
    });

  const pdf = await generateContractPdf({
    contract,
    caseItem: contract.case,
    selectedOffer,
    confirmation,
    confirmations,
  });

  const fileName =
    safeFileName(contract.displayId);

  const storagePath = [
    'contracts',
    new Date(contract.signedAt).getFullYear(),
    contract.case.displayId,
    fileName,
  ].join('/');

  await uploadStorageFile({
    storagePath,
    buffer: pdf.buffer,
    mimeType: 'application/pdf',
  });

  const updatedContract =
    await prisma.$transaction(
      async (tx) => {
        const item =
          await tx.contract.update({
            where: {
              id: contract.id,
            },
            data: {
              pdfUrl: storagePath,
            },
          });

        await tx.auditLog.create({
          data: {
            userId: null,
            entityType: 'Contract',
            entityId: contract.id,
            action: 'CONTRACT_PDF_GENERATED',
            metadata: {
              caseId: contract.caseId,
              storagePath,
              fileName,
              verificationHash:
                pdf.verificationHash,
              hasHandwrittenSignature:
                confirmations.some(
                  (item) =>
                    Boolean(
                      item.signatureDataUrl
                    )
                ),
              confirmations:
                confirmations.map(
                  (item) => ({
                    role: item.role,
                    label: item.label,
                    invitationId:
                      item.invitationId,
                    signedAt:
                      item.signedAt,
                    signatureHash:
                      item.signatureHash ||
                      null,
                  })
                ),
            },
          },
        });

        return item;
      }
    );

  let telegramResult;

  try {
    telegramResult =
      await sendContractPdfToClient({
        telegramId:
          contract.case.applicant
            ?.telegramId,
        pdfBuffer: pdf.buffer,
        fileName,
        contractDisplayId:
          contract.displayId,
      });

    await prisma.auditLog.create({
      data: {
        userId: null,
        entityType: 'Contract',
        entityId: contract.id,
        action: telegramResult.sent
          ? 'CONTRACT_PDF_SENT_TO_TELEGRAM'
          : 'CONTRACT_PDF_TELEGRAM_SKIPPED',
        metadata: {
          caseId: contract.caseId,
          telegramId:
            contract.case.applicant
              ?.telegramId || null,
          ...telegramResult,
        },
      },
    });
  } catch (telegramError) {
    telegramResult = {
      sent: false,
      skipped: false,
      error: telegramError.message,
    };

    await prisma.auditLog.create({
      data: {
        userId: null,
        entityType: 'Contract',
        entityId: contract.id,
        action:
          'CONTRACT_PDF_TELEGRAM_FAILED',
        metadata: {
          caseId: contract.caseId,
          telegramId:
            contract.case.applicant
              ?.telegramId || null,
          error:
            telegramError.message,
        },
      },
    });
  }

  return {
    contract: updatedContract,
    pdfStoragePath: storagePath,
    pdfUrl:
      await createSignedFileUrl(
        storagePath,
        60 * 60 * 24
      ),
    telegram: telegramResult,
    verificationHash:
      pdf.verificationHash,
    reused: false,
  };
}
