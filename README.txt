GK OS — Реклама статистикаси + қизил уведомление FIX

Тузатилди:
1) /api/cases/marketing-stats endpoint қайта қўшилди.
   Олдин endpoint йўқлиги сабаб "Мурожаат топилмади" чиқар эди.
2) /api/cases/marketing-funnel ҳам сақланди.
3) Реклама статистикаси:
   - Start
   - телефон боғланган
   - мурожаат
   - шартнома
   - якунланган
   - рад этилган
   - конверсия
4) Уведомление қўнғироқчаси қизил қилинди.
5) Янги мурожаатлар келса badge:
   1, 2, 3 ... деб ошиб боради.
6) CRM саҳифаси автоматик refresh бўлмайди.
   Фақат фон режимда янги мурожаат текширилади.

Алмаштиринг:
- backend/src/routes/cases.js
- crm/src/App.jsx
- crm/src/pages/MarketingStatsPage.jsx

Commit -> Push origin.
Backend ва CRM deploy бўлади.
