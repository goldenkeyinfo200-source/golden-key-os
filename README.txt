GOLDEN KEY OS — БОТ ВОРОНКАСИ + ТАШЛАБ КЕТГАНЛАР

Алмаштиринг:
1. backend/prisma/schema.prisma
2. backend/src/routes/telegram.js
3. backend/src/routes/cases.js
4. crm/src/pages/MarketingStatsPage.jsx
5. telegram-bot/src/index.js

Янги migration:
backend/prisma/migrations/20260817_marketing_funnel_steps/migration.sql

Натижа:
- /start -> STARTED
- Янги мурожаат -> APPLICATION_STARTED
- Телефон -> PHONE_SENT
- Хизмат -> SERVICE_SELECTED
- Сумма -> AMOUNT_ENTERED
- Изоҳ -> COMMENT_DONE
- Ф.И.Ш. -> NAME_ENTERED
- Тасдиқлаш -> CONFIRMATION_REACHED
- CRM Case яратилди -> CASE_CREATED
- Бекор қилди -> CANCELLED

CRM "Реклама статистикаси"да:
- Ботга кирган
- Мурожаатни бошлаган
- Телефон
- Хизмат танлаган
- Тасдиқлашга етган
- Мурожаат юборган
- Ташлаб кетган
- Қаерда тўхтагани
- Telegram username/ID
- Фаол эмас дақиқаси
- Эслатма юборилган/йўқ

Авто эслатма:
- Фақат "Янги мурожаат"ни бошлаганларга.
- 30 дақиқа давом эттирмаса.
- telegram-bot ҳар 5 дақиқада текширади.
- Бир фойдаланувчига бир марта эслатма юборади.

Қўйгандан кейин:
Commit -> Push origin

Railway deploy:
- backend
- crm
- telegram-bot

Мавжуд Case ва шартномалар ўчмайди.
