Golden Key OS — CasesPage validation fix

Алмаштириш:
crm/src/pages/CasesPage.jsx

Тузатилганлар:
1) birthDate бўш бўлса null эмас, '' юборилади.
   Backend Zod birthDate учун string/'' қабул қилади.

2) Инвестор payload field номлари backend билан мос:
   investorAmount
   investorProfitSharePercent
   investorContractStartDate
   investorContractEndDate
   investorNotes

3) Backend details қайтарса, умумий "Киритилган маълумотларда хато бор"
   ўрнига биринчи аниқ майдон хатоси кўрсатилади.

Қўллаш:
- CasesPage.jsx ни алмаштиринг
- CRM учун commit/push қилинг
- Railway CRM deploy тугашини кутинг
- Иккиламчи ипотекадан янги мурожаат сақлаб кўринг

Backend ёки Prisma'га бу fix учун тегиш шарт эмас.
