@echo off
:: Chuyen ma sang UTF-8 de CMD doc duoc duong dan tieng Viet
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ==========================================
:: PHAN 1: TU DONG BACKUP VAO THU MUC LOCAL
:: ==========================================
set "SRC_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Xuất nhập hàng"
set "BAK_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Backup"

:: Tao thu muc Backup neu chua co
if not exist "%BAK_DIR%" mkdir "%BAK_DIR%"

echo [1/2] Dang tien hanh backup file vao o D...

:: --- Tim so lon nhat cho App Script.js ---
set "maxJS=0"
for %%F in ("%BAK_DIR%\App Script *.js") do (
    for /f "tokens=3 delims=. " %%N in ("%%~nxF") do (
        set /a num=%%N 2>nul
        if !num! gtr !maxJS! set maxJS=!num!
    )
)
set /a nextJS=maxJS + 1

copy "%SRC_DIR%\App Script.js" "%BAK_DIR%\App Script !nextJS!.js"
echo   - Da backup thanh cong: App Script !nextJS!.js

:: --- Tim so lon nhat cho index.html ---
set "maxHTML=0"
for %%F in ("%BAK_DIR%\index *.html") do (
    for /f "tokens=2 delims=. " %%N in ("%%~nxF") do (
        set /a num=%%N 2>nul
        if !num! gtr !maxHTML! set maxHTML=!num!
    )
)
set /a nextHTML=maxHTML + 1

copy "%SRC_DIR%\index.html" "%BAK_DIR%\index !nextHTML!.html"
echo   - Da backup thanh cong: index !nextHTML!.html

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
pause
