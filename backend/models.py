from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Set(Base):
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    folder_path = Column(String(500), default="")  # BỔ SUNG DÒNG NÀY
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Quan hệ 1 học phần có nhiều từ vựng
    vocabularies = relationship("Vocabulary", back_populates="vocab_set", cascade="all, delete-orphan")

from sqlalchemy import Float # Bổ sung Float vào imports nếu chưa có

class Vocabulary(Base):
    __tablename__ = "vocabularies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    word = Column(String(255), nullable=False)
    meaning = Column(String(500), nullable=False)
    set_id = Column(Integer, ForeignKey("sets.id", ondelete="CASCADE"), nullable=True)
    
    # Các trường phục vụ thuật toán Spaced Repetition (SRS)
    repetition = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    next_review = Column(DateTime, default=datetime.utcnow)
    is_starred = Column(Boolean, default=False)

    vocab_set = relationship("Set", back_populates="vocabularies")

class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255))
    
    questions = relationship("ExamQuestion", back_populates="exam")

class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"))
    question = Column(Text)
    opt1 = Column(String(255))
    opt2 = Column(String(255))
    opt3 = Column(String(255))
    opt4 = Column(String(255))
    correct_ans = Column(Integer)
    
    exam = relationship("Exam", back_populates="questions")

class ExamHistory(Base):
    __tablename__ = "exam_histories"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"))
    score = Column(Integer)
    total = Column(Integer)
    wrong_details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("Exam")

class TestHistory(Base):
    __tablename__ = "test_histories"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    set_id = Column(Integer, ForeignKey("sets.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255))
    score = Column(Integer)
    total = Column(Integer)
    wrong_details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    vocab_set = relationship("Set")

class KanjiSet(Base):
    __tablename__ = "kanji_sets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    folder_path = Column(String(500), default="")  # BỔ SUNG DÒNG NÀY
    created_at = Column(DateTime, default=datetime.utcnow)
    
    kanjis = relationship("Kanji", back_populates="kanji_set", cascade="all, delete-orphan")

class Kanji(Base):
    __tablename__ = "kanjis"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kanji = Column(String(255), nullable=False)
    hanviet = Column(String(255), nullable=False)
    hiragana = Column(String(255), nullable=False)
    meaning = Column(String(500), nullable=False)
    kanji_set_id = Column(Integer, ForeignKey("kanji_sets.id", ondelete="CASCADE"), nullable=True)

    kanji_set = relationship("KanjiSet", back_populates="kanjis")