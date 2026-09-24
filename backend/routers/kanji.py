from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy import func
import models
import schemas
from database import get_db

router = APIRouter(
    tags=["kanji"]
)

@router.get("/kanji-sets", response_model=list[schemas.KanjiSetOut])
def get_kanji_sets(db: Session = Depends(get_db)):
    sets_data = db.query(
        models.KanjiSet.id,
        models.KanjiSet.title,
        models.KanjiSet.folder_path,
        models.KanjiSet.created_at,
        func.count(models.Kanji.id).label("vocab_count")
    ).outerjoin(models.Kanji, models.KanjiSet.id == models.Kanji.kanji_set_id)\
     .group_by(models.KanjiSet.id).order_by(models.KanjiSet.id.desc()).all()
     
    return [{"id": s.id, "title": s.title, "folder_path": s.folder_path, "created_at": s.created_at, "vocab_count": s.vocab_count} for s in sets_data]

@router.get("/kanji-sets/{set_id}", response_model=schemas.KanjiSetOut)
def get_kanji_set_detail(set_id: int, db: Session = Depends(get_db)):
    db_set = db.query(models.KanjiSet).options(joinedload(models.KanjiSet.kanjis)).filter(models.KanjiSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Không tìm thấy học phần Kanji")
    return db_set

@router.get("/search-kanji", response_model=list[schemas.KanjiOut])
def search_kanji(q: str, db: Session = Depends(get_db)):
    if not q.strip():
        return []
    search_query = f"%{q.strip()}%"
    results = db.query(models.Kanji).filter(
        (models.Kanji.kanji.ilike(search_query)) | 
        (models.Kanji.hanviet.ilike(search_query)) |
        (models.Kanji.hiragana.ilike(search_query)) |
        (models.Kanji.meaning.ilike(search_query))
    ).limit(10).all()
    return results

@router.post("/kanji-sets/bulk-import")
def import_kanji_sets(payload: schemas.KanjiBulkImportRequest, db: Session = Depends(get_db)):
    new_set = models.KanjiSet(title=payload.title.strip(), folder_path=payload.folder_path)
    db.add(new_set)
    db.flush()

    if not payload.raw_text or not payload.raw_text.strip():
        db.commit()
        return {"message": "Đã tạo thư mục Kanji rỗng.", "errors": []}

    lines = payload.raw_text.strip().split('\n')
    imported_count = 0
    errors = []
    
    for idx, line in enumerate(lines):
            line_clean = line.strip()
            if not line_clean:
                continue
            parts = [p.strip() for p in line_clean.split('|')]
            if len(parts) >= 4:
                kanji = models.Kanji(
                    kanji=parts[0],
                    hanviet=parts[1],
                    hiragana=parts[2],
                    meaning=parts[3],
                    kanji_set_id=new_set.id
                )
                db.add(kanji)
                imported_count += 1
            else:
                errors.append(f"Dòng {idx + 1}: Thiếu cột dữ liệu (Yêu cầu 4 cột).")
    
    if imported_count == 0:
        db.rollback()
        raise HTTPException(status_code=400, detail="Không tìm thấy từ vựng Kanji hợp lệ nào.")
        
    db.commit()
    return {"message": f"Đã tạo học phần với {imported_count} từ vựng Kanji.", "errors": errors}

@router.delete("/kanji-sets/{kanji_set_id}")
def delete_kanji_set(kanji_set_id: int, db: Session = Depends(get_db)):
    db_set = db.query(models.KanjiSet).filter(models.KanjiSet.id == kanji_set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Không tìm thấy học phần Kanji")
    db.delete(db_set)
    db.commit()
    return {"message": "Đã xóa học phần Kanji thành công"}

@router.put("/kanji/{kanji_id}", response_model=schemas.KanjiOut)
def update_kanji(kanji_id: int, payload: schemas.KanjiUpdate, db: Session = Depends(get_db)):
    db_kanji = db.query(models.Kanji).filter(models.Kanji.id == kanji_id).first()
    if not db_kanji:
        raise HTTPException(status_code=404, detail="Không tìm thấy chữ Kanji")
        
    if not payload.kanji.strip() or not payload.hanviet.strip() or not payload.hiragana.strip() or not payload.meaning.strip():
        raise HTTPException(status_code=400, detail="Không được để trống các trường thông tin Kanji")
    
    db_kanji.kanji = payload.kanji.strip()
    db_kanji.hanviet = payload.hanviet.strip()
    db_kanji.hiragana = payload.hiragana.strip()
    db_kanji.meaning = payload.meaning.strip()
    db.commit()
    db.refresh(db_kanji)
    return db_kanji

@router.delete("/kanji/{kanji_id}")
def delete_kanji(kanji_id: int, db: Session = Depends(get_db)):
    db_kanji = db.query(models.Kanji).filter(models.Kanji.id == kanji_id).first()
    if not db_kanji:
        raise HTTPException(status_code=404, detail="Không tìm thấy chữ Kanji")
    db.delete(db_kanji)
    db.commit()
    return {"message": "Đã xóa chữ Kanji"}