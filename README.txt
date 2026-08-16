GK OS — FIX: саҳифани янгиламасдан notification

Нима тузатилди:
1. CRM саҳифаси автоматик қайта юкланмайди.
2. Янги мурожаат текшируви 30 секундда бир марта ФОНДА API орқали бажарилади.
3. Оператор қайси саҳифада ишлаётган бўлса, ўша саҳифада қолади.
4. Янги мурожаат келса:
   - овозли сигнал;
   - popup;
   - Bell қизил badge;
   - browser notification (рухсат берилса).
5. Popup фақат "Мурожаатни очиш" босилганда Мурожаатлар саҳифасига ўтади.
6. Реклама статистикасидаги авторизация хатоси тузатилди:
   CRM /cases/marketing-funnel endpoint'ини чақиради.

Алмаштиринг:
- backend/src/routes/cases.js
- crm/src/App.jsx
- crm/src/pages/MarketingStatsPage.jsx

Commit -> Push origin.
Backend ва CRM deploy бўлади.
