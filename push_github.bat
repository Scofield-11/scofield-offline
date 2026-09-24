@echo off
set /p msg="Nhap noi dung commit: "

echo.
echo === DANG PUSH FRONTEND ===
cd frontend
call git add .
call git commit -m "%msg%"
call git push origin main

echo.
echo === DANG PUSH BACKEND ===
cd ../backend
call git add .
call git commit -m "%msg%"
call git push origin main

cd ..
echo.
echo === HOAN THANH ===
pause