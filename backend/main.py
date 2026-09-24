from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import vocabulary, exam, kanji
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os


app = FastAPI(title="Quizlet Clone API")

# Cấu hình CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS:
    origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Routers
app.include_router(vocabulary.router)
app.include_router(exam.router)
app.include_router(kanji.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend API is running properly on Render!"}