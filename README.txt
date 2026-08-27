Golden Key OS — contract sign localhost FIX

Алмаштирилади:
backend/src/routes/contracts.js

Муаммо:
QR/sign URL fallback 'http://localhost:5173/sign' эди.
Production'да «Шартнома яратиш» / QR жараёни localhost'га кетиб қолар эди.

Тузатилди:
fallback:
https://crm-production-eced.up.railway.app/sign

Устуворлик:
1) PUBLIC_SIGN_URL
2) CRM_PUBLIC_URL
3) https://crm-production-eced.up.railway.app/sign

Railway backend Variables'да тавсия:
PUBLIC_SIGN_URL=https://crm-production-eced.up.railway.app/sign

Deploy:
1) contracts.js ни backend/src/routes/contracts.js га алмаштиринг
2) commit + push
3) BACKEND service'ни deploy қилинг
4) янги QR яратинг; эски QR/token'лар эски URLни сақлаган бўлиши мумкин
