GK Bank Review — 1-bosqich

Almashtiriladigan fayl:
crm/src/pages/BankPortalPage.jsx

Backend bu bosqichda o'zgarmaydi.
Mavjud endpointlar ishlatiladi:
GET /api/banks/cases/:caseId/assignments
PATCH /api/banks/assignments/:assignmentId/review

Qo'shildi:
- KATM natijasi
- KATM izohi
- Garov tekshiruvi
- Garov izohi
- VIEWED / UNDER_REVIEW / NEEDS_DOCUMENTS / REJECTED holatlari
- Natijani saqlash

Keyingi qadam:
mavjud BankOffersSection orqali bank taklifini test qilamiz.
