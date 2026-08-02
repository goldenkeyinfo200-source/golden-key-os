GOLDEN KEY OS — DOCUMENTS CRM MODULE

ТАЙЁР ФАЙЛЛАР:
crm/src/components/documents/DocumentsSection.jsx
crm/src/styles/documents.css
crm/src/pages/CaseDetails.jsx

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги crm папкасини лойиҳангиз устига ташланг.
3. Windows сўраса:
   Replace the files in the destination
4. GitHub Desktop:
   Summary: Add documents upload interface
   Commit to main
   Push origin
5. Railway CRM deployment тугашини кутинг.
6. CRM'ни Ctrl + F5 билан янгиланг.

НАТИЖА:
- Ҳужжат юклаш тугмаси
- Ҳужжат турини танлаш
- JPG, PNG, WEBP, PDF
- 15 MB гача
- Supabase Storage'га POST
- Ҳужжатларни кўриш
- Ҳужжатларни ўчириш
- Автоматик рўйхат янгиланиши

API:
GET    /api/documents/case/:caseId
POST   /api/documents/case/:caseId
DELETE /api/documents/:documentId
