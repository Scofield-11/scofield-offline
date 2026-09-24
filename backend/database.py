import os
import ssl
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Cấu hình SSL: Bỏ qua kiểm tra chứng chỉ tự cấp trên Aiven, tắt SSL nếu chạy localhost
connect_args = {}
if DB_HOST and DB_HOST not in ["localhost", "127.0.0.1"]:
    CA_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca.pem")
    connect_args["ssl"] = {
        "ca": CA_FILE_PATH,
        "cert_reqs": ssl.CERT_NONE,
        "check_hostname": False
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()