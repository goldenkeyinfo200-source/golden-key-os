import 'dotenv/config';

import { prisma } from '../src/config/prisma.js';
import { defaultContractHtml } from '../src/services/contract-template.js';

/*
|--------------------------------------------------------------------------
| Golden Key OS — шартнома шаблонларини янгилаш
|--------------------------------------------------------------------------
|
| Нима қилади:
|
| 1. Ҳар бир хизмат тури учун мавжуд шаблонларни текширади.
| 2. Эски актив шаблонларни isActive=false қилади.
| 3. Энг охирги version рақамини топади.
| 4. Янги тўлиқ шартномани кейинги version сифатида яратади.
| 5. Янги версияни isActive=true қилади.
|
| Эски шартномалар ва улар боғланган template'лар ўчирилмайди.
|
*/

const SERVICE_TYPES = [
  'PRIMARY_MORTGAGE',
  'SECONDARY_MORTGAGE',
  'MICROLOAN',
  'REALTOR_SERVICE',
  'SALE_PURCHASE',
  'CADASTRE_SERVICE',
  'OTHER',
];

const SERVICE_NAMES = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди хизмати',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа хизмат',
};

async function updateTemplate(serviceType) {
  console.log('');
  console.log('------------------------------------------');
  console.log(`Хизмат тури: ${serviceType}`);

  /*
   * Энг охирги шаблон версиясини топамиз.
   */
  const latestTemplate =
    await prisma.contractTemplate.findFirst({
      where: {
        serviceType,
      },

      orderBy: {
        version: 'desc',
      },

      select: {
        id: true,
        version: true,
        htmlBody: true,
        isActive: true,
      },
    });

  /*
   * Агар ҳозирги энг охирги актив шаблон
   * айнан ҳозирги defaultContractHtml билан бир хил бўлса,
   * қайтадан янги версия яратмаймиз.
   */
  const currentHtml = defaultContractHtml();

  if (
    latestTemplate?.isActive &&
    latestTemplate.htmlBody?.trim() === currentHtml.trim()
  ) {
    console.log(
      `✅ ${SERVICE_NAMES[serviceType]} учун тўлиқ шаблон аллақачон актив.`
    );

    console.log(
      `   Version: ${latestTemplate.version}`
    );

    return {
      skipped: true,
      serviceType,
      version: latestTemplate.version,
    };
  }

  /*
   * Янги версия рақами.
   */
  const nextVersion =
    (latestTemplate?.version || 0) + 1;

  /*
   * Transaction:
   *
   * аввал эски active template'ларни ўчирамиз,
   * кейин янги active template яратамиз.
   */
  const created =
    await prisma.$transaction(async (tx) => {
      await tx.contractTemplate.updateMany({
        where: {
          serviceType,
          isActive: true,
        },

        data: {
          isActive: false,
        },
      });

      const item =
        await tx.contractTemplate.create({
          data: {
            name:
              `${SERVICE_NAMES[serviceType]} — тўлиқ асосий шартнома`,

            serviceType,

            version: nextVersion,

            htmlBody: currentHtml,

            isActive: true,
          },
        });

      return item;
    });

  console.log(
    `✅ Янги тўлиқ шаблон яратилди.`
  );

  console.log(
    `   ID: ${created.id}`
  );

  console.log(
    `   Version: ${created.version}`
  );

  return {
    skipped: false,
    serviceType,
    version: created.version,
    id: created.id,
  };
}

async function main() {
  console.log('');
  console.log('==========================================');
  console.log('Golden Key OS');
  console.log('Шартнома шаблонлари янгиланмоқда...');
  console.log('==========================================');

  const results = [];

  for (const serviceType of SERVICE_TYPES) {
    try {
      const result =
        await updateTemplate(serviceType);

      results.push({
        ok: true,
        ...result,
      });
    } catch (error) {
      console.error('');
      console.error(
        `❌ ${serviceType} шаблонини янгилашда хато:`
      );

      console.error(error);

      results.push({
        ok: false,
        serviceType,
        error: error.message,
      });
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('НАТИЖА');
  console.log('==========================================');

  for (const result of results) {
    if (!result.ok) {
      console.log(
        `❌ ${result.serviceType}: ${result.error}`
      );

      continue;
    }

    if (result.skipped) {
      console.log(
        `⏭ ${result.serviceType}: version ${result.version} аллақачон тўғри`
      );

      continue;
    }

    console.log(
      `✅ ${result.serviceType}: янги version ${result.version}`
    );
  }

  const failed =
    results.filter((item) => !item.ok);

  console.log('');

  if (failed.length > 0) {
    console.log(
      `⚠️ ${failed.length} та хизмат турида хато бор.`
    );

    process.exitCode = 1;
  } else {
    console.log(
      '🎉 Барча шартнома шаблонлари муваффақиятли янгиланди.'
    );
  }
}

main()
  .catch((error) => {
    console.error(
      'Шартнома шаблонларини янгилашда умумий хато:',
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });