$procs = @(Get-Process -Name "Code" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero })
if ($procs.Count -eq 0) {
    Write-Host "  - [!] VS Code khong chay hoac khong co cua so"
    exit
}

$wsh = New-Object -ComObject WScript.Shell
$ok = $wsh.AppActivate($procs[0].Id)
if (-not $ok) {
    Write-Host "  - [!] Khong the focus VS Code (thu lai)"
    exit
}

Start-Sleep -Milliseconds 500
$wsh.SendKeys("^+p")
Start-Sleep -Milliseconds 800
$wsh.SendKeys("save all{ENTER}")
Start-Sleep -Milliseconds 700
Write-Host "  - Da Save All thanh cong"
