from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime
from fastapi import HTTPException

class VocabularyBase(BaseModel):
    word: str = Field(..., max_length=255)
    meaning: str = Field(..., max_length=500)

    @field_validator('word', 'meaning')
    @classmethod
    def check_not_empty(cls, v, info):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail=f"Từ vựng và ý nghĩa không được để chuỗi rỗng")
        return str(v).strip()

class VocabularyCreate(VocabularyBase):
    set_id: Optional[int] = None

class VocabularyOut(VocabularyBase):
    id: int
    set_id: Optional[int] = None
    repetition: Optional[int] = 0
    ease_factor: Optional[float] = 2.5
    interval: Optional[int] = 0
    next_review: Optional[datetime] = None
    is_starred: Optional[bool] = False

    class Config:
        from_attributes = True

class SRSUpdate(BaseModel):
    is_correct: bool

class StarUpdate(BaseModel):
    is_starred: bool

class SetBase(BaseModel):
    title: str = Field(..., max_length=255)
    folder_path: Optional[str] = ""
    @field_validator('title')
    @classmethod
    def check_title(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Tên học phần không được để trống")
        return str(v).strip()

class SetCreate(SetBase):
    pass

class SetOut(SetBase):
    id: int
    created_at: datetime
    vocab_count: int = 0
    vocabularies: Optional[List[VocabularyOut]] = None

    class Config:
        from_attributes = True

class BulkImportRequest(BaseModel):
    title: str = Field(..., max_length=255)
    raw_text: str
    folder_path: Optional[str] = ""
    @field_validator('title')
    @classmethod
    def check_title(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Tên học phần không được để trống")
        return str(v).strip()

class VocabularyUpdate(VocabularyBase):
    pass

class ExamImport(BaseModel):
    title: str = Field(..., max_length=255)
    raw_text: str

    @field_validator('title')
    @classmethod
    def check_title(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Tên bài thi không được để trống")
        return str(v).strip()

    @field_validator('raw_text')
    @classmethod
    def check_exam_content(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Nội dung bài thi không được để trống")
        
        lines = str(v).strip().split('\n')
        valid_count = 0
        for line in lines:
            if not line.strip():
                continue
            if len(line.split('|')) == 6:
                valid_count += 1
                
        if valid_count < 1:
            raise HTTPException(status_code=400, detail="Bài thi phải có tối thiểu 1 câu hỏi hợp lệ (có đủ 6 phần cách nhau bởi dấu |)")
        return str(v)

class ExamHistoryCreate(BaseModel):
    score: int
    total: int
    wrong_details: Any 

class ExamHistoryOut(ExamHistoryCreate):
    id: int
    exam_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TestHistoryCreate(BaseModel):
    set_id: Optional[int] = None
    title: str = Field(..., max_length=255)
    score: int
    total: int
    wrong_details: Any

class TestHistoryOut(TestHistoryCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class KanjiBase(BaseModel):
    kanji: str = Field(..., max_length=255)
    hanviet: str = Field(..., max_length=255)
    hiragana: str = Field(..., max_length=255)
    meaning: str = Field(..., max_length=500)

    @field_validator('kanji', 'hanviet', 'hiragana', 'meaning')
    @classmethod
    def check_not_empty(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Các trường thông tin Kanji không được để trống")
        return str(v).strip()

class KanjiOut(KanjiBase):
    id: int
    kanji_set_id: Optional[int] = None

    class Config:
        from_attributes = True

class KanjiUpdate(KanjiBase):
    pass

class KanjiSetOut(BaseModel):
    id: int
    title: str
    folder_path: Optional[str] = ""
    created_at: datetime
    vocab_count: int = 0
    kanjis: Optional[List[KanjiOut]] = None

    class Config:
        from_attributes = True

class KanjiBulkImportRequest(BaseModel):
    title: str = Field(..., max_length=255)
    raw_text: str
    folder_path: Optional[str] = ""

    @field_validator('title')
    @classmethod
    def check_title(cls, v):
        if not v or not str(v).strip():
            raise HTTPException(status_code=400, detail="Tên học phần không được để trống")
        return str(v).strip()

