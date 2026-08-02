GOLDEN KEY OS — DOCUMENTS BACKEND

ФАЙЛЛАР:
backend/src/config/cloudinary.js
backend/src/routes/documents.js
backend/src/routes/index.js
backend/src/routes/cases.js
backend/src/server.js
backend/package.json

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги backend папкасини лойиҳангиз устига ташланг.
3. Replace the files in the destination тугмасини босинг.
4. GitHub Desktop:
   Summary: Add documents and Cloudinary backend
   Commit to main
   Push origin
5. Railway backend янги deployment тугашини кутинг.

RAILWAY VARIABLES:
Энг осон усул:
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

Ёки алоҳида:
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

API:
GET    /api/documents/case/:caseId
POST   /api/documents/case/:caseId
DELETE /api/documents/:documentId

ҚАБУЛ ҚИЛИНАДИГАН ФАЙЛЛАР:
JPG, PNG, WEBP, PDF
Максимал ҳажм: 15 MB
