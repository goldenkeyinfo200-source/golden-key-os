Golden Key OS — Investor Partnership backend v1

Алмаштириладиган файллар:
1) backend/prisma/schema.prisma
2) backend/src/routes/cases.js

Қўшилди:
- ServiceType: INVESTOR_PARTNERSHIP
- Мурожаат ID префикси: GK-IN-2026-000001
- Case майдонлари:
  investorAmount
  investorProfitSharePercent
  investorContractStartDate
  investorContractEndDate
  investorNotes

Инвесторнинг Ф.И.Ш., телефон, ЖШШИР, паспорт ва манзили алоҳида
Case майдонларига такрорланмайди — улар мавжуд Client/applicant моделида сақланади.

Backend текширувлари:
- инвестиция суммаси > 0
- фойда улуши > 0 ва <= 100
- бошланиш ва тугаш санаси шарт
- тугаш санаси бошланиш санасидан кейин бўлиши шарт

Муҳим:
Файлларни push қилгандан кейин backend Railway Console'да:
  npx prisma db push

Бу ўзгариш фақат янги enum қиймати ва nullable колонкалар қўшади.
Мавжуд мурожаатларни ўчириш учун DROP талаб қилинмайди.

Кейинги босқич:
crm/src/pages/CasesPage.jsx'га инвестор учун махсус форма қўшилади.
