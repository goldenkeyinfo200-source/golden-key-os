import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_CASE_IDS = [
  'GK-IP-2026-000017',
  'GK-IP-2026-000005',
];

async function main() {
  console.log('====================================');
  console.log('TEST МУРОЖААТЛАРНИ ТОЗАЛАШ');
  console.log('====================================');

  const cases = await prisma.case.findMany({
    where: {
      displayId: {
        in: TEST_CASE_IDS,
      },
    },
    select: {
      id: true,
      displayId: true,
      applicantClientId: true,
    },
  });

  if (cases.length === 0) {
    console.log('Ўчириладиган мурожаатлар топилмади.');
    return;
  }

  console.log('\nТопилди:');

  for (const item of cases) {
    console.log(`- ${item.displayId}`);
  }

  const caseIds = cases.map((item) => item.id);
  const clientIds = [
    ...new Set(
      cases
        .map((item) => item.applicantClientId)
        .filter(Boolean)
    ),
  ];

  await prisma.$transaction(async (tx) => {
    /*
     * QR экранда ушбу мурожаатларнинг шартномаси
     * очиқ турган бўлса, аввал экранни тозалаймиз.
     */
    const contracts = await tx.contract.findMany({
      where: {
        caseId: {
          in: caseIds,
        },
      },
      select: {
        id: true,
      },
    });

    const contractIds = contracts.map((item) => item.id);

    if (contractIds.length > 0) {
      await tx.kioskDevice.updateMany({
        where: {
          currentContractId: {
            in: contractIds,
          },
        },
        data: {
          currentContractId: null,
          currentQrDataUrl: null,
          currentSignUrl: null,
          qrExpiresAt: null,
          displayStatus: 'IDLE',
        },
      });
    }

    /*
     * Case'ларни ўчирамиз.
     * Cascade муносабатлари бўлса:
     * Payment, Contract, Invitation ва бошқа
     * боғланган маълумотлар ҳам ўчади.
     */
    const deletedCases = await tx.case.deleteMany({
      where: {
        id: {
          in: caseIds,
        },
      },
    });

    console.log(
      `\nЎчирилган мурожаатлар: ${deletedCases.count}`
    );

    /*
     * Энди фақат ҳеч қаерда ишлатилмаётган
     * тест мижозларни ўчирамиз.
     */
    for (const clientId of clientIds) {
      const [
        applicantCases,
        borrowerRecords,
        documents,
      ] = await Promise.all([
        tx.case.count({
          where: {
            applicantClientId: clientId,
          },
        }),

        tx.borrower.count({
          where: {
            clientId,
          },
        }),

        tx.document.count({
          where: {
            clientId,
          },
        }),
      ]);

      if (
        applicantCases === 0 &&
        borrowerRecords === 0 &&
        documents === 0
      ) {
        await tx.client.delete({
          where: {
            id: clientId,
          },
        });

        console.log(
          `Тест мижоз ҳам ўчирилди: ${clientId}`
        );
      } else {
        console.log(
          `Мижоз бошқа маълумотларда ишлатилгани учун сақланди: ${clientId}`
        );
      }
    }
  });

  console.log('\n====================================');
  console.log('ТОЗАЛАШ МУВАФФАҚИЯТЛИ ЯКУНЛАНДИ');
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error('\nХАТОЛИК:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });