# Golden Key OS — ҳужжатлар ва далолатномалар модули

## Қўшилган функциялар

- Мижоздан қабул қилинган оригинал/нусха ҳужжатларни рўйхатга олиш.
- Ҳужжатларни қабул қилиш далолатномаси.
- Ҳужжатларни қайтариш далолатномаси.
- Бажарилган ишлар (кўрсатилган хизматлар) далолатномаси.
- Ҳар бир далолатнома учун 15 дақиқалик бир марталик QR.
- Мижоз тасдиқлагандан кейин `usedAt`, `confirmedAt` ва AuditLog сақланади.
- Қайтариш далолатномаси тасдиқланганда ҳужжатлар `RETURNED` бўлади.
- QR тасдиқдан кейин PDF яратилиб Supabase Storage'га сақланади.

## Файлларни жойлаштириш

1. `backend/prisma/schema.prisma`
   → `golden-key-os/backend/prisma/schema.prisma`

2. `backend/src/routes/case-acts.js`
   → `golden-key-os/backend/src/routes/case-acts.js`

3. `backend/src/routes/public-acts.js`
   → `golden-key-os/backend/src/routes/public-acts.js`

4. `backend/src/services/act-pdf.js`
   → `golden-key-os/backend/src/services/act-pdf.js`

5. `backend/src/server.js`
   → `golden-key-os/backend/src/server.js`

6. `crm/src/components/case-acts/ClientDocumentsActsSection.jsx`
   → янги папка/файл қилиб қўйинг.

7. `crm/src/pages/CaseDetails.jsx`
   → `golden-key-os/crm/src/pages/CaseDetails.jsx`

## Жуда муҳим тартиб

Аввал барча файлларни қўйинг. Шундан кейин:

```bash
cd backend
npx prisma format
npx prisma validate
npx prisma db push
```

`db push` муваффақиятли бўлгандан кейин backend'ни deploy қилинг.

Backend ишга тушгандан кейин CRM'ни deploy қилинг.

## Environment

Одатда янги variable шарт эмас. QR URL сервернинг ўзига қараб автомат шаклланади.

Агар Railway proxy/host сабаб QR URL нотўғри чиқса, backend Variables'га:

`PUBLIC_API_URL=https://backend-production-....up.railway.app`

қўйиш мумкин.

## Тест

1. Мурожаат карточкасини очинг.
2. "Юридик ҳужжатлар" блокида 2 та тест ҳужжат киритинг.
3. Иккаласини белгилаб "Қабул қилиш далолатномасини тайёрлаш".
4. "QR чиқариш".
5. Телефонда QR'ни скан қилиб тасдиқланг.
6. CRM'да "Ҳолатни янгилаш" босинг — далолатнома "Тасдиқланган" бўлиши ва PDF чиқиши керак.
7. Кейин шу ҳужжатларни белгилаб "Қайтариш далолатномаси" → QR → тасдиқ.
8. Ҳужжатлар ҳолати "Қайтарилган" бўлиши керак.
9. "Бажарилган ишлар далолатномаси"ни тайёрлаб QR билан тасдиқланг.
