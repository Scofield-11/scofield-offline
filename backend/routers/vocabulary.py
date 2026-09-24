from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
import crud
import csv
import io
from datetime import datetime, timedelta
router = APIRouter(
    tags=["vocabularies"]
)

@router.get("/stats/global")
def get_global_stats(db: Session = Depends(get_db)):
    total = db.query(models.Vocabulary).count()
    return {"total": total}

# API Lấy danh sách tất cả học phần kèm từ vựng bên trong (Có phân trang)
@router.get("/sets", response_model=list[schemas.SetOut])
def get_all_sets(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    sets_data = crud.get_all_sets(db, skip=skip, limit=limit)
    return [{"id": s.id, "title": s.title, "folder_path": s.folder_path, "created_at": s.created_at, "vocab_count": s.vocab_count} for s in sets_data]

@router.get("/sets/{set_id}", response_model=schemas.SetOut)
def get_set_detail(set_id: int, db: Session = Depends(get_db)):
    db_set = crud.get_set_detail(db, set_id)
    if not db_set:
        raise HTTPException(status_code=404, detail="Không tìm thấy học phần")
    return db_set

@router.get("/search", response_model=list[schemas.VocabularyOut])
def search_vocabulary(q: str, db: Session = Depends(get_db)):
    if not q.strip():
        return []
    search_query = f"%{q.strip()}%"
    results = db.query(models.Vocabulary).filter(
        (models.Vocabulary.word.ilike(search_query)) | 
        (models.Vocabulary.meaning.ilike(search_query))
    ).limit(10).all()
    return results

# API Lấy tất cả từ vựng (Có phân trang)
@router.get("/vocabularies", response_model=list[schemas.VocabularyOut])
def get_all_vocabularies(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    return crud.get_all_vocabularies(db, skip=skip, limit=limit)

@router.post("/vocabularies/bulk-import")
def import_bulk_vocabularies(payload: schemas.BulkImportRequest, db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Tên học phần không được để trống")
        
    imported_count, errors = crud.create_set_with_vocabularies(db, payload.title.strip(), payload.raw_text, payload.folder_path)
    
    if imported_count is None:
        raise HTTPException(status_code=400, detail="Không tìm thấy từ vựng hợp lệ nào. Kiểm tra lại định dạng.")
        
    response_msg = f"Đã tạo học phần '{payload.title}' với {imported_count} từ vựng thành công."
    if errors:
        response_msg += f" Bỏ qua {len(errors)} dòng lỗi."
        
    return {
        "message": response_msg,
        "errors": errors 
    }

@router.post("/vocabularies/import-csv")
async def import_csv_file(title: str = Form(...), folder_path: str = Form(""), file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not title.strip():
        raise HTTPException(status_code=400, detail="Tên học phần không được để trống")
        
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng CSV")
        
    content = await file.read()
    try:
        text = content.decode("utf-8-sig") # Hỗ trợ UTF-8 BOM
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File không đúng định dạng UTF-8")
        
    reader = csv.reader(io.StringIO(text))
    raw_lines = []
    
    for row in reader:
        if len(row) >= 2:
            word = row[0].strip()
            meaning = row[1].strip()
                
            # Bỏ qua header nếu có
            if word and meaning and word.lower() != "word":
                raw_lines.append(f"{word} | {meaning}")
                
    if not raw_lines:
        raise HTTPException(status_code=400, detail="Không tìm thấy dữ liệu hợp lệ trong file CSV")
        
    raw_text = "\n".join(raw_lines)
    imported_count, errors = crud.create_set_with_vocabularies(db, title.strip(), raw_text, folder_path)
    
    response_msg = f"Đã tạo học phần '{title}' với {imported_count} từ vựng từ file CSV."
    if errors:
        response_msg += f" Bỏ qua {len(errors)} dòng lỗi."
        
    return {"message": response_msg, "errors": errors}

# API Thêm 1 từ vựng mới vào học phần có sẵn
@router.post("/vocabularies", response_model=schemas.VocabularyOut)
def create_single_vocabulary(payload: schemas.VocabularyCreate, db: Session = Depends(get_db)):
    new_vocab = models.Vocabulary(
        word=payload.word.strip(),
        meaning=payload.meaning.strip(),
        set_id=payload.set_id
    )
    db.add(new_vocab)
    db.commit()
    db.refresh(new_vocab)
    return new_vocab
# API Xóa cả một học phần
@router.delete("/sets/{set_id}")
def delete_set(set_id: int, db: Session = Depends(get_db)):
    db_set = db.query(models.Set).filter(models.Set.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Không tìm thấy học phần")
    db.delete(db_set)
    db.commit()
    return {"message": "Đã xóa học phần thành công"}

@router.put("/vocabularies/{vocab_id}/star")
def toggle_vocabulary_star(vocab_id: int, payload: schemas.StarUpdate, db: Session = Depends(get_db)):
    db_vocab = db.query(models.Vocabulary).filter(models.Vocabulary.id == vocab_id).first()
    if not db_vocab:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")
    
    db_vocab.is_starred = payload.is_starred
    db.commit()
    return {"message": "Đã cập nhật trạng thái sao", "is_starred": db_vocab.is_starred}

@router.put("/vocabularies/{vocab_id}/srs")
def update_vocabulary_srs(vocab_id: int, payload: schemas.SRSUpdate, db: Session = Depends(get_db)):
    db_vocab = db.query(models.Vocabulary).filter(models.Vocabulary.id == vocab_id).first()
    if not db_vocab:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")
    
    # BỔ SUNG: Kiểm tra và gán giá trị mặc định nếu dữ liệu cũ đang bị NULL (None)
    if db_vocab.repetition is None:
        db_vocab.repetition = 0
    if db_vocab.ease_factor is None:
        db_vocab.ease_factor = 2.5
    if db_vocab.interval is None:
        db_vocab.interval = 0
    
    if payload.is_correct:
        if db_vocab.repetition == 0:
            db_vocab.interval = 1
        elif db_vocab.repetition == 1:
            db_vocab.interval = 6
        else:
            db_vocab.interval = int(round(db_vocab.interval * db_vocab.ease_factor))
        db_vocab.repetition += 1
    else:
        db_vocab.repetition = 0
        db_vocab.interval = 1
        db_vocab.ease_factor = max(1.3, db_vocab.ease_factor - 0.2)
        
    db_vocab.next_review = datetime.utcnow() + timedelta(days=db_vocab.interval)
    db.commit()
    db.refresh(db_vocab)
    return {"message": "Đã cập nhật trạng thái SRS", "next_review": db_vocab.next_review}

@router.put("/vocabularies/{vocab_id}")
def update_vocabulary(vocab_id: int, payload: schemas.VocabularyUpdate, db: Session = Depends(get_db)):
    db_vocab = db.query(models.Vocabulary).filter(models.Vocabulary.id == vocab_id).first()
    if not db_vocab:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")
    
    db_vocab.word = payload.word.strip()
    db_vocab.meaning = payload.meaning.strip()
    db.commit()
    db.refresh(db_vocab)
    return db_vocab

# API Xóa 1 từ vựng
@router.delete("/vocabularies/{vocab_id}")
def delete_vocabulary(vocab_id: int, db: Session = Depends(get_db)):
    db_vocab = db.query(models.Vocabulary).filter(models.Vocabulary.id == vocab_id).first()
    if not db_vocab:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")
    
    db.delete(db_vocab)
    db.commit()
    return {"message": "Đã xóa từ vựng"}

@router.post("/test-history")
def save_test_history(payload: schemas.TestHistoryCreate, db: Session = Depends(get_db)):
    history = models.TestHistory(
        set_id=payload.set_id,
        title=payload.title,
        score=payload.score,
        total=payload.total,
        wrong_details=payload.wrong_details
    )
    db.add(history)
    db.commit()
    
    # Giữ lại tối đa 100 lần test gần nhất để không ảnh hưởng thuật toán tính Chuỗi (Streak)
    count = db.query(models.TestHistory).count()
    if count > 100:
        oldest_records = db.query(models.TestHistory).order_by(models.TestHistory.created_at.asc()).limit(count - 100).all()
        for record in oldest_records:
            db.delete(record)
        db.commit()
        
    return {"message": "Đã lưu lịch sử test"}

@router.get("/test-history")
def get_test_history(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    histories = db.query(models.TestHistory).order_by(models.TestHistory.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for h in histories:
        result.append({
            "id": h.id,
            "setId": h.set_id,
            "title": h.title,
            "score": h.score,
            "total": h.total,
            "date": h.created_at.strftime("%d/%m/%Y"), # Lấy ngày để UI gộp nhóm
            "full_date": h.created_at.strftime("%H:%M - %d/%m/%Y"),
            "wrongDetails": h.wrong_details
        })
    return result

@router.delete("/test-history/all")
def clear_test_history(db: Session = Depends(get_db)):
    db.query(models.TestHistory).delete()
    db.commit()
    return {"message": "Đã xóa toàn bộ lịch sử test"}