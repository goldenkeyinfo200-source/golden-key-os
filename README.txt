Golden Key OS — Finance receipt update

1) crm/src/pages/FinancePage.jsx
   Replace with included FinancePage.jsx.

2) backend/src/routes/finance.js
   Included unchanged for reference/current backend compatibility.

What was added:
- "Квитанция" button for every payment in "Тўловлар тарихи".
- Opens an 80mm thermal-printer-ready receipt.
- Includes client, case ID, branch, service, payment date/method/reference and amount.
- Works with normal A4/A5 printers too through the browser print dialog.
- No thermal printer connection is required yet.

After replacing FinancePage.jsx, commit/push and deploy the CRM frontend.
