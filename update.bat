@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: PHAN 1: TU DONG BACKUP (DUNG DUONG DAN TUONG DOI DE TRÁNH LỖI TIẾNG VIỆT)
:: ==========================================
:: %~dp0 la thu muc dang chua file update.bat
set "SRC_DIR=%~dp0"
:: Di lui lai 1 cap (thu muc cha) roi vao Backup
set "BAK_DIR=%~dp0..\Backup"

if not exist "%BAK_DIR%" mkdir "%BAK_DIR%"

echo Dang tu dong Save All trong VS Code...
set "PS1=%TEMP%\vsc_save_%RANDOM%.ps1"
echo $p = Get-Process -Name 'Code' -EA 0 ^| Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } ^| Select-Object -First 1 > "!PS1!"
echo if ($p) { $w = New-Object -ComObject WScript.Shell; $null = $w.AppActivate($p.Id); Start-Sleep -Milliseconds 500; $w.SendKeys('^^+p'); Start-Sleep -Milliseconds 800; $w.SendKeys('save all{ENTER}'); Start-Sleep -Milliseconds 700; Write-Host '  - Da Save All thanh cong' } else { Write-Host '  - VS Code khong chay, bo qua buoc save' } >> "!PS1!"
powershell -NoProfile -ExecutionPolicy Bypass -File "!PS1!"
del "!PS1!" 2>nul
echo.
echo [1/2] Dang tien hanh backup file vao o D...

:: Tim so thu tu tiep theo cho App Script.js
set n=1
:loopJS
if exist "%BAK_DIR%\App Script !n!.js" (
    set /a n+=1
    goto loopJS
)
copy "%SRC_DIR%App Script.js" "%BAK_DIR%\App Script !n!.js" >nul
echo   - Da backup thanh cong: App Script !n!.js

:: Tim so thu tu tiep theo cho index.html
set m=1
:loopHTML
if exist "%BAK_DIR%\index !m!.html" (
    set /a m+=1
    goto loopHTML
)
copy "%SRC_DIR%index.html" "%BAK_DIR%\index !m!.html" >nul
echo   - Da backup thanh cong: index !m!.html

echo.

:: ==========================================
:: PHAN 2: DAY LEN GITHUB
:: ==========================================
echo [2/2] Dang cap nhat len Github...
cd /d "%SRC_DIR%"
git add .
git commit -m "update app"
git push origin main

echo.
echo === DONE! App da duoc cap nhat ===
