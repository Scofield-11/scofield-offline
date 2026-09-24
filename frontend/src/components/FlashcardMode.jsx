import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import Flashcard from './Flashcard';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio'; // Import âm thanh
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';

function FlashcardMode() {
  const { sets, setSets, kanjiSets, setKanjiSets, allVocabs, loading, fetchSets, fetchKanjiSets, fetchAllVocabs } = useContext(VocabContext);
  const [contentType, setContentType] = useState('vocab');
  const [selectedSetId, setSelectedSetId] = useState('all');

  useEffect(() => { fetchSets(); fetchKanjiSets(); fetchAllVocabs(); }, [fetchSets, fetchKanjiSets, fetchAllVocabs]);
  
  const [vocabsToStudy, setVocabsToStudy] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [editingVocab, setEditingVocab] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null); 

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem("flashcardAutoPlay") === "true");
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('meaning');
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSwap = () => {
    if (contentType === 'kanji') {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };
  const containerRef = useRef(null);

  // States dành cho tính năng Vuốt trên Mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => { localStorage.setItem("flashcardAutoPlay", autoPlay); }, [autoPlay]);

  const vibrate = (ms = 40) => { if (navigator.vibrate) navigator.vibrate(ms); };

  const handleStart = async () => {
    let pool = [];

    if (selectedSetId === 'all') {
      if (contentType === 'kanji') {
        const fullKanjiSets = await Promise.all(kanjiSets.map(async (s) => {
          if (s.kanjis) return s;
          const res = await api.get(`/kanji-sets/${s.id}`);
          return res.data;
        }));
        setKanjiSets(fullKanjiSets);
        pool = fullKanjiSets.flatMap(s => s.kanjis || []);
      } else {
        pool = allVocabs;
      }
    } else {
      if (contentType === 'kanji') {
        let targetSet = kanjiSets.find(s => s.id === parseInt(selectedSetId));
        if (targetSet && !targetSet.kanjis) {
          const res = await api.get(`/kanji-sets/${targetSet.id}`);
          targetSet = res.data;
          setKanjiSets(prev => prev.map(s => s.id === targetSet.id ? targetSet : s));
        }
        pool = targetSet?.kanjis || [];
      } else {
        let targetSet = sets.find(s => s.id === parseInt(selectedSetId));
        if (targetSet && !targetSet.vocabularies) {
          const res = await api.get(`/sets/${targetSet.id}`);
          targetSet = res.data;
          setSets(prev => prev.map(s => s.id === targetSet.id ? targetSet : s));
        }
        pool = targetSet?.vocabularies || [];
      }
    }

    if (pool.length === 0) return toast.warning("Học phần này chưa có dữ liệu!");

    setVocabsToStudy(pool);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsFinished(false);
    setIsSlideshow(false); 
    if (!isFullscreen) toggleFullscreen();
  };

  const handleNext = useCallback(() => {
    vibrate();
    playSound('pop'); // Tiếng pop khi chuyển thẻ
    if (currentIndex < vocabsToStudy.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      setIsSlideshow(false); 
      playSound('win'); // Tiếng hoàn thành
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [currentIndex, vocabsToStudy.length]);

  const handlePrev = useCallback(() => {
    vibrate();
    playSound('pop');
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const handleShuffle = () => {
    vibrate(60);
    const shuffled = [...vocabsToStudy].sort(() => 0.5 - Math.random());
    setVocabsToStudy(shuffled);
    setCurrentIndex(0); 
    setIsFinished(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = containerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if (elem?.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // Logic Vuốt ngón tay
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    
    // Yêu cầu vuốt ngang hơn 50px và lớn hơn độ lệch dọc
    if (Math.abs(distanceX) > 50 && Math.abs(distanceX) > distanceY) {
      if (distanceX > 0) handleNext(); // Vuốt sang trái
      else handlePrev(); // Vuốt sang phải
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    document.addEventListener("webkitfullscreenchange", handleFs);
    return () => {
      document.removeEventListener("fullscreenchange", handleFs);
      document.removeEventListener("webkitfullscreenchange", handleFs);
    };
  }, []);

  useEffect(() => {
    if (!isStarted || isFinished || editingVocab || noteModalVocab) return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space') { e.preventDefault(); document.querySelector('.flashcard-container')?.click(); } 
      else if (e.code === 'ArrowRight') handleNext();
      else if (e.code === 'ArrowLeft') handlePrev();
      else if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, editingVocab, noteModalVocab, handleNext, handlePrev]);

  useEffect(() => {
    let flipTimer, nextTimer;
    if (isSlideshow && !isFinished && isStarted && !editingVocab && !noteModalVocab) {
      flipTimer = setTimeout(() => document.querySelector('.flashcard-container')?.click(), 2500); 
      nextTimer = setTimeout(() => handleNext(), 5000); 
    }
    return () => { clearTimeout(flipTimer); clearTimeout(nextTimer); };
  }, [currentIndex, isSlideshow, isFinished, isStarted, editingVocab, noteModalVocab, handleNext]);

  const handleQuickSave = async (e) => {
    e.preventDefault();
    try {
      if (contentType === 'kanji') {
        await api.put(`/kanji/${editingVocab.id}`, editingVocab);
      } else {
        await api.put(`/vocabularies/${editingVocab.id}`, editingVocab);
      }
      setVocabsToStudy(prev => {
        const newArr = [...prev];
        newArr[currentIndex] = editingVocab;
        return newArr;
      });
      toast.success("Đã lưu chỉnh sửa!");
      setEditingVocab(null);
    } catch (err) { toast.error("Lỗi khi lưu!"); }
  };

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-5 fade-in-slide" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-0 p-4 p-md-5 rounded-4 bg-white" style={{ borderRadius: '24px' }}>
          <h3 className="text-center mb-5 fw-bold text-dark" style={{ opacity: 0.8 }}>Thiết lập Flashcards</h3>
          
          <div className="mb-4">
            <label className="form-label fw-bold text-muted mb-2">1. Chọn loại nội dung:</label>
            <ContentTypeSelector contentType={contentType} setContentType={setContentType} />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold text-muted mb-2">2. Chọn học phần muốn ôn:</label>
            <SetSelector sets={contentType === 'kanji' ? kanjiSets : sets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} />
          </div>

          <div className="mb-5 d-flex flex-column gap-3">
            <div className="d-flex align-items-center justify-content-between bg-light p-3 rounded-4 border-0 shadow-sm transition-all">
              <div className="text-center" style={{ flex: 1, minWidth: 0 }}>
                <span className="text-muted small fw-bold d-block mb-1 text-truncate">MẶT TRƯỚC</span>
                {contentType === 'kanji' ? (
                  <select className="form-select bg-white border-0 fw-bold shadow-sm text-center mx-auto mt-1" style={{ color: '#8a2be2', maxWidth: '140px' }} value={kanjiFront} onChange={(e) => setKanjiFront(e.target.value)}>
                    <option value="kanji" className="text-dark">Hán tự</option>
                    <option value="hanviet" className="text-dark">Hán Việt</option>
                    <option value="hiragana" className="text-dark">Phiên âm</option>
                    <option value="meaning" className="text-dark">Ý nghĩa</option>
                  </select>
                ) : (
                  <span className="fw-bold fs-5 text-truncate d-block mt-2" style={{ color: '#8a2be2' }}>{isReversed ? 'Ý nghĩa' : 'Từ vựng'}</span>
                )}
              </div>
              
              <div className="px-2 px-md-3" style={{ flexShrink: 0 }}>
                <button 
                  type="button"
                  className="btn btn-warning rounded-circle shadow-sm fw-bold d-flex align-items-center justify-content-center transition-all hover-scale m-0" 
                  style={{width: '48px', height: '48px', fontSize: '1.2rem'}}
                  onClick={handleSwap}
                  title="Đảo chiều thẻ"
                >
                  🔄
                </button>
              </div>
              
              <div className="text-center" style={{ flex: 1, minWidth: 0 }}>
                <span className="text-muted small fw-bold d-block mb-1 text-truncate">MẶT SAU</span>
                {contentType === 'kanji' ? (
                  <select className="form-select bg-white border-0 fw-bold shadow-sm text-center mx-auto mt-1 text-success" style={{ maxWidth: '140px' }} value={kanjiBack} onChange={(e) => setKanjiBack(e.target.value)}>
                    <option value="kanji" className="text-dark">Hán tự</option>
                    <option value="hanviet" className="text-dark">Hán Việt</option>
                    <option value="hiragana" className="text-dark">Phiên âm</option>
                    <option value="meaning" className="text-dark">Ý nghĩa</option>
                  </select>
                ) : (
                  <span className="fw-bold text-success fs-5 text-truncate d-block mt-2">{isReversed ? 'Từ vựng' : 'Ý nghĩa'}</span>
                )}
              </div>
            </div>
          </div>

          <button 
            className="btn btn-lg w-100 fw-bold shadow-lg text-white hover-scale" 
            style={{ borderRadius: '14px', padding: '16px', backgroundColor: '#8a2be2', border: 'none' }} 
            onClick={handleStart}
          >
            Bắt đầu lật thẻ
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mt-5 text-center fade-in-slide">
        <div className="card shadow-lg border-0 p-5 rounded-4 mx-auto text-white position-relative overflow-hidden" style={{ maxWidth: '500px', backgroundColor: '#8a2be2' }}>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <div className="display-1 mb-3">🎓</div>
            <h2 className="fw-bold mb-3">Chúc mừng!</h2>
            <p className="fs-5 opacity-75 mb-4">Bạn đã ôn tập xong <strong>{vocabsToStudy.length}</strong> thẻ từ vựng.</p>
            <div className="d-flex flex-column gap-3">
              <button className="btn btn-warning py-3 fw-bold text-dark fs-5 shadow-sm rounded-4 hover-scale" onClick={handleShuffle}>🔀 Trộn & Học lại</button>
              <button className="btn btn-light py-3 fw-bold fs-5 text-primary shadow-sm rounded-4 hover-scale" onClick={() => { setIsStarted(false); setIsFullscreen(false); }}>Học phần khác</button>
            </div>
          </div>
          <div className="position-absolute bg-white opacity-10 rounded-circle" style={{ width: '200px', height: '200px', top: '-50px', right: '-50px' }}></div>
          <div className="position-absolute bg-white opacity-10 rounded-circle" style={{ width: '150px', height: '150px', bottom: '-20px', left: '-50px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-fluid py-4 text-center transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      
      {editingVocab && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4" style={{ width: '90%', maxWidth: '400px' }}>
            <h5 className="fw-bold mb-4" style={{ color: '#8a2be2' }}>✏️ Sửa nhanh thẻ</h5>
            <form onSubmit={handleQuickSave}>
              {contentType === 'kanji' ? (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.kanji} onChange={e => setEditingVocab({...editingVocab, kanji: e.target.value})} placeholder="Kanji" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hanviet} onChange={e => setEditingVocab({...editingVocab, hanviet: e.target.value})} placeholder="Hán Việt" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hiragana} onChange={e => setEditingVocab({...editingVocab, hiragana: e.target.value})} placeholder="Hiragana" required />
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={e => setEditingVocab({...editingVocab, meaning: e.target.value})} placeholder="Ý nghĩa" required />
                </>
              ) : (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.word} onChange={e => setEditingVocab({...editingVocab, word: e.target.value})} placeholder="Từ vựng" required />
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={e => setEditingVocab({...editingVocab, meaning: e.target.value})} placeholder="Ý nghĩa" required />
                </>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-secondary w-50 fw-bold rounded-3" onClick={() => setEditingVocab(null)}>Hủy</button>
                <button type="submit" className="btn w-50 fw-bold text-white rounded-3" style={{ backgroundColor: '#8a2be2' }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteModalVocab && (
        <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />
      )}

      <div className="d-flex justify-content-between align-items-center mx-auto mb-3" style={{ maxWidth: '450px' }}>
        <h3 className="m-0 fw-bold">Flashcards</h3>
        <button className="btn btn-light rounded-circle shadow-sm border-0 hover-scale" onClick={toggleFullscreen} title="Bật/Tắt Toàn màn hình (Phím F)">
          {isFullscreen ? '↙️' : '⛶'}
        </button>
      </div>
      
      <div className="mb-2 text-muted fw-bold d-flex justify-content-between align-items-center mx-auto" style={{ maxWidth: '450px' }}>
        <span>Thẻ {currentIndex + 1} / {vocabsToStudy.length}</span>
        <span>{Math.round(((currentIndex + 1) / vocabsToStudy.length) * 100)}%</span>
      </div>
      <div className="progress mb-4 mx-auto shadow-sm" style={{ height: '8px', maxWidth: '450px', borderRadius: '10px' }}>
        <div className="progress-bar" role="progressbar" style={{ width: `${((currentIndex + 1) / vocabsToStudy.length) * 100}%`, backgroundColor: '#8a2be2' }}></div>
      </div>

      <div 
        className="d-flex justify-content-center fade-in-slide" 
        key={currentIndex}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndEvent}
      >
        <Flashcard 
          vocab={vocabsToStudy[currentIndex]} 
          autoPlay={autoPlay} 
          contentType={contentType}
          isReversed={isReversed}
          kanjiFront={kanjiFront}
          kanjiBack={kanjiBack}
          onEdit={setEditingVocab}
          onSaveNote={(item) => {
            if (contentType === 'kanji') {
              setNoteModalVocab({ word: item.kanji, furigana: item.hiragana, meaning: item.meaning });
            } else {
              setNoteModalVocab(item);
            }
          }} 
        />
      </div>
      
      <div className="d-flex flex-wrap justify-content-center gap-4 mx-auto mt-4" style={{ maxWidth: '600px' }}>
        <div className="form-check form-switch bg-white px-4 py-2 rounded-pill shadow-sm border d-flex align-items-center gap-2">
          <input className="form-check-input m-0 shadow-sm" type="checkbox" id="autoPlaySwitch" checked={autoPlay} onChange={() => setAutoPlay(!autoPlay)} style={{ cursor: 'pointer' }} />
          <label className="form-check-label text-muted fw-bold m-0" htmlFor="autoPlaySwitch" style={{ cursor: 'pointer' }}>Tự động phát âm</label>
        </div>
        <div className="form-check form-switch bg-white px-4 py-2 rounded-pill shadow-sm border d-flex align-items-center gap-2">
          <input className="form-check-input m-0 shadow-sm" type="checkbox" id="slideshowSwitch" checked={isSlideshow} onChange={() => setIsSlideshow(!isSlideshow)} style={{ cursor: 'pointer' }} />
          <label className="form-check-label text-muted fw-bold m-0" htmlFor="slideshowSwitch" style={{ cursor: 'pointer' }}>Trình chiếu chậm</label>
        </div>
      </div>

      <div className="mt-4 d-flex justify-content-center gap-3">
        <button className="btn btn-outline-secondary px-4 py-2 fw-bold rounded-pill hover-scale" onClick={handlePrev} disabled={currentIndex === 0}>← Trước</button>
        <button className="btn btn-warning px-4 py-2 fw-bold text-dark shadow-sm rounded-pill hover-scale" onClick={handleShuffle}>🔀 Trộn thẻ</button>
        <button className="btn px-4 py-2 fw-bold text-white shadow-sm rounded-pill hover-scale" style={{ backgroundColor: '#8a2be2' }} onClick={handleNext}>Tiếp →</button>
      </div>
      
      {!isFullscreen && (
        <p className="text-muted small mb-0 mt-4 d-none d-md-block">
          💡 <strong>Mẹo:</strong> Phím <strong>Space</strong> lật thẻ, <strong>Trái/Phải</strong> (Vuốt ngang) để chuyển từ, <strong>F</strong> toàn màn hình.
        </p>
      )}

      {!isFullscreen && (
        <div className="mt-4">
           <button className="btn btn-link text-muted text-decoration-none fw-bold hover-bg-light rounded-pill px-3 py-2" onClick={() => setIsStarted(false)}>
              &larr; Cài đặt lại / Đổi học phần
           </button>
        </div>
      )}
    </div>
  );
}

export default FlashcardMode;