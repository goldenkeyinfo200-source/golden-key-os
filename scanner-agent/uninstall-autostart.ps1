$TaskName = "Golden Key Scanner Agent"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like '*scanner-agent*server.js*'
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host "Golden Key Scanner Agent autostart olib tashlandi." -ForegroundColor Green
