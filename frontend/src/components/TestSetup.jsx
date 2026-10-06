import React from 'react';
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';
import GameModeSelector from './GameModeSelector';

function TestSetup({ sets, currentContentType, selectedSetId, setSelectedSetId, questionCount, setQuestionCount, poolSize, questionFormat, setQuestionFormat, isReversed, setIsReversed, kanjiFront, setKanjiFront, kanjiBack, setKanjiBack, generateTest }) {
  
  let hasFourFields = false;
  if (currentContentType === 'kanji') {
    hasFourFields = true;
  } else {
    if (String(selectedSetId) === 'lang_ja' || String(selectedSetId) === 'all_ja') {
      hasFourFields = true;
    } else if (!String(selectedSetId).startsWith('lang_en') && !String(selectedSetId).startsWith('lang_kanji') && !String(selectedSetId).startsWith('all_')) {
      if (String(selectedSetId).startsWith('folder_')) {
         const folderName = String(selectedSetId).substring(7);
         const targetSets = sets.filter(s => (s.folder_path || '🏠 Thư mục gốc') === folderName);
         hasFourFields = targetSets.some(s => s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana));
      } else {
        const s = sets.find(set => set.id == selectedSetId);
        if (s && s.vocabularies) {
          hasFourFields = s.vocabularies.some(v => v.hanviet || v.hiragana);
        }
      }
    }
  }

  const getFrontLabel = () => {
    return isReversed ? 'Ý nghĩa' : 'Từ vựng';
  };
  
  const getBackLabel = () => {
    return isReversed ? 'Từ vựng' : 'Ý nghĩa';
  };

  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  return (
    <div className="container mt-5 fade-in-slide" style={{ maxWidth: '650px' }}>
      <div className="card shadow-sm border-0 p-4 p-md-5 rounded-4 bg-white" style={{ borderRadius: '24px' }}>
        <h3 className="text-center mb-5 fw-bold text-dark">Thiết lập Bài Thi</h3>
        
        <div className="mb-4">
          <label className="form-label fw-bold text-muted mb-2">1. Chọn học phần:</label>
          <SetSelector sets={sets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} />
        </div>

        <div className="row g-3 mb-4">
          <div className="col-6">
            <label className="form-label fw-bold text-muted">Số lượng câu hỏi:</label>
            <input 
              type="number" 
              className="form-control form-control-lg bg-light border-0 fw-bold text-dark shadow-sm" 
              style={{ borderRadius: '12px', height: '56px' }}
              value={questionCount} 
              onChange={(e) => setQuestionCount(Number(e.target.value))} 
              max={poolSize}
              min={1}
            />
            <small className="text-muted d-block mt-1">Tối đa {poolSize} câu.</small>
          </div>
          <div className="col-6">
            <label className="form-label fw-bold text-muted">Hình thức thi:</label>
            <select 
              className="form-select form-select-lg bg-light border-0 fw-bold text-dark shadow-sm" 
              style={{ borderRadius: '12px', height: '56px' }}
              value={questionFormat} 
              onChange={(e) => setQuestionFormat(e.target.value)}
            >
              <option value="choice">100% Trắc nghiệm</option>
              <option value="typing">100% Tự luận</option>
              <option value="mixed">Hỗn hợp (50/50)</option>
            </select>
          </div>
        </div>

        <div className="mb-5">
            <GameModeSelector
              hasFourFields={hasFourFields}
              currentContentType={currentContentType}
              isReversed={isReversed}
              setIsReversed={setIsReversed}
              kanjiFront={kanjiFront}
              setKanjiFront={setKanjiFront}
              kanjiBack={kanjiBack}
              setKanjiBack={setKanjiBack}
              onSwap={handleSwap}
              sectionLabel="Gói đề thi (Exam Presets)"
              presets={[
                {
                  id: 'jlpt-meaning', icon: '🧠', iconBg: '#ede9fe', label: 'Dạng bài JLPT (Ý nghĩa)',
                  getDesc: (f, b, type) => {
                    const fLabel = f === 'meaning' ? 'Ý nghĩa' : 'Từ/Hán tự';
                    const bLabel = b === 'meaning' ? 'Ý nghĩa' : 'Từ/Hán tự';
                    return `Nhìn ${fLabel} ➔ Trả lời ${bLabel}`;
                  },
                  frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'meaning',
                  isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'meaning') || (f === 'meaning' && b === w); }
                },
                {
                  id: 'jlpt-reading', icon: '🗣️', iconBg: '#fef3c7', label: 'Dạng bài JLPT (Cách đọc)',
                  getDesc: (f, b) => {
                    const fLabel = f === 'hiragana' ? 'Phiên âm' : 'Từ/Hán tự';
                    const bLabel = b === 'hiragana' ? 'Phiên âm' : 'Từ/Hán tự';
                    return `Nhìn ${fLabel} ➔ Trả lời ${bLabel}`;
                  },
                  frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'hiragana',
                  isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'hiragana') || (f === 'hiragana' && b === w); }
                },
                {
                  id: 'hanviet', icon: '👑', iconBg: '#fee2e2', label: 'Vua Hán Tự',
                  getDesc: (f, b) => {
                    const fLabel = f === 'meaning' ? 'Ý nghĩa' : 'Hán Việt';
                    const bLabel = b === 'meaning' ? 'Ý nghĩa' : 'Hán Việt';
                    return `Nhìn ${fLabel} ➔ Trả lời ${bLabel}`;
                  },
                  frontKey: () => 'hanviet', backKey: () => 'meaning',
                  isActive: (f, b) => (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet')
                },
                {
                  id: 'listening', icon: '🎧', iconBg: '#dbeafe', label: 'Nghe Hiểu / Từ vựng',
                  getDesc: (f, b) => {
                    const fLabel = f === 'meaning' ? 'Ý nghĩa' : 'Phiên âm';
                    const bLabel = b === 'meaning' ? 'Ý nghĩa' : 'Phiên âm';
                    return `Nhìn ${fLabel} ➔ Trả lời ${bLabel}`;
                  },
                  frontKey: () => 'hiragana', backKey: () => 'meaning',
                  isActive: (f, b) => (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana')
                }
              ]}
            />
          </div>

        <button className="btn btn-primary btn-lg w-100 fw-bold shadow-lg" style={{ borderRadius: '14px', padding: '15px', backgroundColor: '#8a2be2', border: 'none' }} onClick={generateTest}>
          Bắt đầu làm bài 🚀
        </button>
      </div>
    </div>
  );
}

export default TestSetup;