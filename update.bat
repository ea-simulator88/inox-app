@echo off

REM === THU MUC ===
set SOURCE_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Xuất nhập hàng
set BACKUP_DIR=D:\Excel\Work\Python\App xuất nhập hàng inox\Backup

cd /d "%SOURCE_DIR%"

REM === TIM SO MAX TU FILE INDEX ===
set max=0

for %%f in ("%BACKUP_DIR%\index *.html") do (
    set "name=%%~nf"
    setlocal enabledelayedexpansion
    set "num=!name:index =!"
    if !num! GTR !max! (
        endlocal & set max=!num!
    ) else (
        endlocal
    )
)

REM === SO MOI ===
set /a next=%max%+1

REM === BACKUP HTML ===
copy "%SOURCE_DIR%\index.html" "%BACKUP_DIR%\index %next%.html"

REM === BACKUP JS (TEN FILE MOI) ===
copy "%SOURCE_DIR%\App Script.js" "%BACKUP_DIR%\App Script %next%.js"

echo Backup created:
echo - index %next%.html
echo - App Script %next%.js

REM === GIT ===
git add .
git commit -m "update app"
git push origin main

echo.
echo === DONE! App da duoc cap nhat ===
pause
