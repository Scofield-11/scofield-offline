
@echo off
echo Dang khoi dong he thong...
 
:: Chay Backend o mot cua so moi
start "Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"
 
:: Chay Frontend o mot cua so moi
start "Frontend" cmd /k "cd frontend && npm run dev"
 
:: Doi 5 giay de server (dac biet Vite) khoi dong xong
timeout /t 5 /nobreak > NUL
 
:: Tu dong mo trinh duyet toi trang web (Vite mac dinh la port 5173)
start "" http://localhost:5173
 
echo He thong da khoi dong xong!
 