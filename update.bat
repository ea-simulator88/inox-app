@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: PHAN 1: TU DONG BACKUP VAO FOLDER THEO SO THU TU
:: ==========================================
set "SRC_DIR=%~dp0"
set "BAK_DIR=%~dp0..\Backup"

if not exist "%BAK_DIR%" mkdir "%BAK_DIR%"

:: Tim so thu tu folder tiep theo
set n=1
:loopFolder
if exist "%BAK_DIR%\Backup !n!" (
    set /a n+=1
    goto loopFolder
)

set "DEST=%BAK_DIR%\Backup !n!"
mkdir "%DEST%"

echo [1/2] Dang backup vao folder: Backup !n!

copy "%SRC_DIR%index.html"    "%DEST%\index !n!.html"      >nul
echo   - index !n!.html

copy "%SRC_DIR%style.css"     "%DEST%\style !n!.css"       >nul
echo   - style !n!.css

copy "%SRC_DIR%app.js"        "%DEST%\app !n!.js"          >nul
echo   - app !n!.js

copy "%SRC_DIR%App Script.js" "%DEST%\App Script !n!.js"   >nul
echo   - App Script !n!.js

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
