@echo off
cd /d "%~dp0"
set ALLOWED_ORIGINS=https://crm-production-eced.up.railway.app,http://localhost:5173,http://127.0.0.1:5173
npm start
pause
