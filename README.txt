GK Debtors Module v1

ЯНГИ ФАЙЛЛАР:
1) backend/src/routes/debtors.js
2) crm/src/pages/DebtorsPage.jsx

АЛМАШТИРИЛАДИ:
3) backend/src/routes/cases.js
4) backend/src/routes/index.js
5) crm/src/App.jsx

НАТИЖА:
- Одатий "Мурожаатлар" рўйхатида ARCHIVED ва CANCELLED кўринмайди.
- Менюда "Қарздорлар" бўлими пайдо бўлади.
- Мижоз маблағни олган, хизмат ҳақи бор ва тўлиқ тўламаган ишлар
  автоматик Қарздорларда кўринади.
- Қисман тўлов киритилса қарздорлар рўйхатида қолади.
- Қолдиқ тўлиқ тўланса:
  Payment = PAID
  Case.status = ARCHIVED
  CaseHistory ёзилади
  AuditLog ёзилади
  Қарздорлардан йўқолади
  Архивда пайдо бўлади.

ҚАРЗДОРЛАРНИ КЎРАДИ:
SUPER_ADMIN
DIRECTOR
BRANCH_MANAGER
RECEPTION_MANAGER
ACCOUNTANT

DEPLOY:
1) 5 та файлни тегишли жойига қўйинг
2) Commit + Push
3) Railway backend deploy
4) Vercel frontend deploy
5) Мурожаатлар → Архивланган/Бекор қилинган йўқлигини текширинг
6) Қарздорлар → тўлов киритиб тест қилинг
7) Тўлиқ тўловдан кейин Архивда пайдо бўлганини текширинг
