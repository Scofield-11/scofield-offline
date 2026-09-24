@echo off
echo Dang xoa cac file repomix cu...
del /q /f repomix-frontend.md >nul 2>&1
del /q /f repomix-backend.md >nul 2>&1

echo Dang tao file repomix-frontend.md...
call npx repomix frontend --style markdown --output repomix-frontend.md

echo Dang tao file repomix-backend.md...
call npx repomix backend --style markdown --output repomix-backend.md

echo Hoan thanh cap nhat!
pause