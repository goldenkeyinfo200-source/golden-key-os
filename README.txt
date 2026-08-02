GOLDEN KEY OS — SUPABASE STORAGE ПАКЕТИ

АРХИВ ИЧИДАГИ ФАЙЛЛАР:
backend/package.json
backend/src/config/supabase.js
backend/src/services/supabaseStorage.js
backend/src/routes/documents.js

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги backend папкасини лойиҳангиз устига ташланг.
3. Windows сўраса:
   Replace the files in the destination
4. GitHub Desktop:
   Summary: Replace Cloudinary with Supabase Storage
   Commit to main
   Push origin
5. Railway backend deployment тугашини кутинг.

RAILWAY VARIABLES:
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_DOCUMENTS_BUCKET=documents

SUPABASE_ANON_KEY бу backend upload учун шарт эмас,
лекин қолдириш мумкин.

SUPABASE BUCKET:
documents
Private ҳолатда қолсин.

ҚАБУЛ ҚИЛИНАДИ:
JPG
PNG
WEBP
PDF

МАКСИМАЛ ҲАЖМ:
15 MB

МУҲИМ:
Cloudinary package.json дан олиб ташланди.
Supabase secret key фақат Railway backend Variables ичида сақланади.
