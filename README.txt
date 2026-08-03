GOLDEN KEY OS — ҲУЖЖАТЛАР ВА ШАРТНОМАЛАРНИ ҚАЙТА УЛАШ

ПАКЕТ ИЧИДА:
crm/src/pages/CaseDetails.jsx
crm/src/components/documents/DocumentsSection.jsx
crm/src/components/contracts/ContractsSection.jsx

МУАММО:
CaseDetails.jsx ичида ҳужжатлар ва шартномаларнинг фақат статик кўриниши
қолиб кетган эди. Шу сабаб:
- ҳужжат юклаш тугмаси чиқмасди;
- файл танлаш ойнаси очилмасди;
- шартнома яратиш тугмаси чиқмасди;
- QR яратиш ишламасди;
- PDF тайёрлаш ва очиш ишламасди.

ТУЗАТИЛГАНЛАР:
1. DocumentsSection CaseDetails'га уланди.
2. Ҳужжат юклаш modal'и компонент ичида мавжуд ва ишлайди.
3. Кўриш, юклаб олиш ва ўчириш қайта ишлайди.
4. ContractsSection CaseDetails'га уланди.
5. Шартнома яратиш тугмаси қайта чиқади.
6. Бир марталик QR яратиш ишлайди.
7. Тасдиқланган шартнома учун PDF тайёрлаш ишлайди.
8. PDF очиш ва юклаб олиш ишлайди.

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги crm папкасини лойиҳа устига ташланг.
3. Replace the files in the destination ни босинг.
4. GitHub Desktop:
   Summary: Restore documents and contracts sections
5. Commit to main.
6. Push origin.
7. CRM deploy тугашини кутинг.
8. Браузерда Ctrl + F5 қилинг.

BACKEND ВА DATABASE:
Бу пакет фақат CRM frontend'ни тузатади.
npx prisma db push керак эмас.
