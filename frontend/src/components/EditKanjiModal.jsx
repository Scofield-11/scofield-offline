import { useState } from "react";
import api from "../api/axiosConfig";

function EditKanjiModal({ kanjiItem, onClose, onUpdateSuccess }) {
  const [kanji, setKanji] = useState(kanjiItem.kanji);
  const [hanviet, setHanviet] = useState(kanjiItem.hanviet);
  const [hiragana, setHiragana] = useState(kanjiItem.hiragana);
  const [meaning, setMeaning] = useState(kanjiItem.meaning);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!kanji.trim() || !hanviet.trim() || !hiragana.trim() || !meaning.trim()) {
      setError("Vui lòng nhập đầy đủ cả 4 trường");
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/kanji/${kanjiItem.id}`, {
        kanji: kanji.trim(),
        hanviet: hanviet.trim(),
        hiragana: hiragana.trim(),
        meaning: meaning.trim(),
      });
      onUpdateSuccess(res.data);
    } catch (err) {
      setError("Có lỗi xảy ra khi lưu thay đổi");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Sửa chữ Kanji</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Chữ Hán</label>
                <input type="text" className="form-control" value={kanji} onChange={(e) => setKanji(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Hán Việt</label>
                <input type="text" className="form-control" value={hanviet} onChange={(e) => setHanviet(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Cách đọc (Hiragana)</label>
                <input type="text" className="form-control" value={hiragana} onChange={(e) => setHiragana(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Ý nghĩa</label>
                <input type="text" className="form-control" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
              </div>
              {error && <p className="text-danger">{error}</p>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditKanjiModal;