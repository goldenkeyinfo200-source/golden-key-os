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
    const error = new Error('PDF яратиш учун шартнома топилмади');
    error.status = 404;
    throw error;
  }

  if (contract.status !== 'SIGNED' || !contract.signedAt) {
    const error = new Error(
      'PDF фақат тасдиқланган шартнома учун яратилади'
    );
    error.status = 409;
    throw error;
  }

  if (
    contract.pdfUrl &&
    !/^https?:\/\//i.test(contract.pdfUrl)
  ) {
    return {
      contract,
      pdfStoragePath: contract.pdfUrl,
      pdfUrl: await createSignedFileUrl(
        contract.pdfUrl,
        60 * 60 * 24
      ),
      telegram: {
        sent: false,
        skipped: true,
        reason: 'PDF аввал яратилган',
      },
      reused: true,
    };
  }

  const selectedOffer = contract.case.bankOffers[0] || null;

  const pdf = await generateContractPdf({
    contract,
    caseItem: contract.case,
    selectedOffer,
    confirmation,
  });

  const fileName = safeFileName(contract.displayId);
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

  const updatedContract = await prisma.$transaction(
    async (tx) => {
      const item = await tx.contract.update({
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
            verificationHash: pdf.verificationHash,
          },
        },
      });

      return item;
    }
  );

  let telegramResult;

  try {
    telegramResult = await sendContractPdfToClient({
      telegramId: contract.case.applicant?.telegramId,
      pdfBuffer: pdf.buffer,
      fileName,
      contractDisplayId: contract.displayId,
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
            contract.case.applicant?.telegramId || null,
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
        action: 'CONTRACT_PDF_TELEGRAM_FAILED',
        metadata: {
          caseId: contract.caseId,
          telegramId:
            contract.case.applicant?.telegramId || null,
          error: telegramError.message,
        },
      },
    });
  }

  return {
    contract: updatedContract,
    pdfStoragePath: storagePath,
    pdfUrl: await createSignedFileUrl(
      storagePath,
      60 * 60 * 24
    ),
    telegram: telegramResult,
    verificationHash: pdf.verificationHash,
    reused: false,
  };
}
