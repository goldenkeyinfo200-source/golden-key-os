$ErrorActionPreference = "Stop"

$TaskName = "Golden Key Scanner Agent"
$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Golden Key Scanner Agent o'rnatilmoqda..." -ForegroundColor Cyan

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "Node.js topilmadi. Avval Node.js LTS o'rnating." -ForegroundColor Red
    exit 1
}

Set-Location $AgentDir
Write-Host "Node paketlari tekshirilmoqda..." -ForegroundColor Cyan
& npm install
if ($LASTEXITCODE -ne 0) { throw "npm install xatolik bilan tugadi." }

$nodeExe = $nodeCmd.Source
$serverJs = Join-Path $AgentDir "server.js"

# Eski task bo'lsa yangilash uchun olib tashlaymiz.
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument ('"' + $serverJs + '"') `
    -WorkingDirectory $AgentDir

# Har safar aynan shu Windows foydalanuvchisi tizimga kirganda ishga tushadi.
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Agent yiqilib qolsa har 1 daqiqada qayta ishga tushirishga urinadi.
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 10 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Golden Key CRM uchun lokal scanner agent. Windowsga kirganda avtomatik ishga tushadi." | Out-Null

# Hozirning o'zida ham ishga tushiramiz.
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 2

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:17831/health" -TimeoutSec 5
    if ($health.ok) {
        Write-Host "" 
        Write-Host "MUVAFFAQIYATLI: Scanner Agent avtomatik ishga tushishga sozlandi." -ForegroundColor Green
        Write-Host "Windows qayta yoqilganda agent o'zi ishga tushadi." -ForegroundColor Green
        Write-Host "CRMni qayta ochishingiz mumkin." -ForegroundColor Green
    }
} catch {
    Write-Host "Task yaratildi, lekin agent health tekshiruvi hozircha javob bermadi." -ForegroundColor Yellow
    Write-Host "Task Scheduler ichida '$TaskName' taskini tekshiring." -ForegroundColor Yellow
}
