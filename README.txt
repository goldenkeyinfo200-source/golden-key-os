Golden Key OS — Super Admin login sync fix

Нима тузатилди:
- Backend startup вақтида Railway ADMIN_LOGIN / ADMIN_PASSWORD билан SUPER_ADMIN синхронланади.
- Агар admin бор бўлса, маълумот ўчирилмайди; фақат role/isActive ва зарур бўлса passwordHash янгиланади.
- Case, Client, Contract, Payment, Appraisal ва бошқа жадвалларга тегилмайди.
- Backend URL ўзгармаган:
  https://backend-production-40a1.up.railway.app

Қўллаш:
1. ZIP ичидаги backend/src/services/admin-sync.js янги файлни қўшинг.
2. ZIP ичидаги backend/src/server.js билан мавжуд server.js ни алмаштиринг.
3. GitHub commit/push қилинг.
4. Railway backend deployment Success/Active бўлишини кутинг.
5. CRM да ADMIN_LOGIN ва ADMIN_PASSWORD қийматлари билан киринг.

Муҳим:
- Railway backend Variables да ADMIN_LOGIN ва ADMIN_PASSWORD тўғри бўлиши шарт.
- ADMIN_PASSWORD камида 8 белги.
- DATABASE_URL, Prisma schema ва мавжуд маълумотларга бу patch тегмайди.
