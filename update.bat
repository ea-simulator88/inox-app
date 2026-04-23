@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: PHẦN 1: TỰ ĐỘNG BACKUP VÀO THƯ MỤC LOCAL
:: ==========================================
set "SRC_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Xuất nhập hàng"
set "BAK_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Backup"

:: Tạo thư mục Backup nếu chưa có
if not exist "%BAK_DIR%" mkdir "%BAK_DIR%"

echo [1/2] Dang tien hanh backup file vao o D...

:: Tim so thu tu tiep theo cho App Script.js
set n=1
:loopJS
if exist "%BAK_DIR%\App Script !n!.js" (
    set /a n+=1
    goto loopJS
)
copy "%SRC_DIR%\App Script.js" "%BAK_DIR%\App Script !n!.js" >nul
echo   - Da copy thanh cong: App Script !n!.js

:: Tim so thu tu tiep theo cho index.html
set m=1
:loopHTML
if exist "%BAK_DIR%\index !m!.html" (
    set /a m+=1
    goto loopHTML
)
copy "%SRC_DIR%\index.html" "%BAK_DIR%\index !m!.html" >nul
echo   - Da copy thanh cong: index !m!.html

echo.

:: ==========================================
:: PHẦN 2: ĐẨY LÊN GITHUB (Giữ nguyên của anh)
:: ==========================================
echo [2/2] Dang cap nhat len Github...
cd /d "%SRC_DIR%"
git add .
git commit -m "update app"
git push origin main

echo.
echo === DONE! App da duoc cap nhat ===
pause
