Golden Key OS — CRM API URL fix

Алмаштириш:
crm/src/services/api.js

Railway CRM Variables:
VITE_API_URL=https://backend-production-40a1.up.railway.app/api

Қўллаш:
1) ZIP ичидаги api.js ни crm/src/services/api.js ўрнига қўйинг.
2) GitHub commit/push қилинг.
3) Railway crm service'да VITE_API_URL ни юқоридаги қийматга қўйинг.
4) CRM'ни тўлиқ rebuild/redeploy қилинг.
5) Browser'да Ctrl+F5 қилинг.
6) DevTools Network'да appraisals сўрови 40a1 доменига кетишини текширинг.

Backend ва Prisma'га тегилмайди.
