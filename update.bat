@echo off
chcp 65001 >nul
pushd "D:\Excel\Work\Python\App xuất nhập hàng inox\Xuất nhập hàng"
git add .
git commit -m "update app"
git push origin main
popd
echo.
echo === DONE! App da duoc cap nhat ===
pause
