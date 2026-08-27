$ErrorActionPreference = "Stop"

Write-Host "Golden Key Scanner Agent ўрнатилмоқда..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js топилмади. Аввал Node.js LTS ўрнатинг." -ForegroundColor Red
    exit 1
}

npm install

Write-Host ""
Write-Host "Тайёр." -ForegroundColor Green
Write-Host "Ишга тушириш:"
Write-Host "  npm start"
Write-Host ""
Write-Host "CRM ойнасини қайта очинг. 'Сканердан олиш' тугмаси актив бўлади."
