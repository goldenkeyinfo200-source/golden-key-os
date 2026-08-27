Golden Key OS — Баҳолаш компаниялари модули v1

ҚЎШИЛДИ:
- APPRAISAL_EMPLOYEE роли.
- Баҳолаш компаниялари (AppraisalCompany).
- Баҳолаш заявкалари (AppraisalRequest), ID: GK-AV-YYYY-000001.
- Мурожаат карточкасида "Баҳолаш компаниясига заявка".
- Мавжуд ҳужжатларни checkbox билан танлаб баҳоловчига юбориш.
- Мулк расмларини алоҳида юклаш.
- Баҳолаш компанияси учун алоҳида логин/пароль аккаунти.
- Баҳоловчи: Қабул қилиш → Иш жараёнида → PDF ҳисобот юклаш.
- Баҳоланган қиймат, ҳисобот рақами ва санаси.
- Тайёр PDF Golden Key ходимига мурожаат карточкасида кўринади.
- Ҳар бир файл учун 20 МБ лимит.
- Мавжуд documents.js лимити 15 МБдан 20 МБга кўтарилди.
- AuditLog қайдлари.

ФАЙЛЛАР:
backend/prisma/schema.prisma                    ALMASHTIRISH
backend/src/routes/appraisals.js               YANGI
backend/src/routes/documents.js                ALMASHTIRISH
crm/src/components/appraisals/AppraisalSection.jsx  YANGI
crm/src/pages/AppraisalsPage.jsx               YANGI
crm/src/pages/CaseDetails.jsx                  ALMASHTIRISH
crm/src/App.jsx                                ALMASHTIRISH
ROUTES-INDEX-PATCH.txt                         2 qatorlik patch

ЎРНАТИШ ТАРТИБИ:
1) Файлларни папкалари бўйича қўйинг.
2) ROUTES-INDEX-PATCH.txt даги 2 қаторни current backend/src/routes/index.js га қўшинг.
3) GitHub commit/push.
4) Backend Railway deploy олдидан schema ўзгаргани учун:
   npx prisma db push
5) Deploy тугасин.
6) CRM deploy тугасин.
7) Super Admin билан "Баҳолаш" менюсини очинг.
8) Компания қўшинг.
9) Шу компания учун баҳоловчи аккаунт яратинг.
10) Мурожаат карточкаси → Баҳолашга юбориш.
11) Баҳоловчи аккаунти билан кириб заявкани қабул қилинг ва PDF ҳисобот юкланг.

20 МБ:
- documents.js: 20 МБ
- appraisal property photo/supporting file/report: 20 МБ
- report фақат PDF
- property photo: JPG/PNG/WEBP

ЭҲТИЁТ:
schema.prisma ўзгарган, шунинг учун бу пакетда prisma db push КЕРАК.
Current routes/index.js ни тўлиқ алмаштирманг; фақат ROUTES-INDEX-PATCH.txt даги 2 қаторни қўшинг.
