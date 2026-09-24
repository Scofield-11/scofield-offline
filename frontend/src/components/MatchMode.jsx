import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';

function MatchMode() {
  const { sets, setSets, allVocabs, kanjiSets, setKanjiSets, loading, fetchSets, fetchAllVocabs, fetchKanjiSets } = useContext(VocabContext);
  const [contentType, setContentType] = useState('vocab');
  const [selectedSetId, setSelectedSetId] = useState('all');
  const [difficulty, setDifficulty] = useState(6); 
  const [gameMode, setGameMode] = useState('normal'); 
  const [kanjiMatchA, setKanjiMatchA] = useState('kanji');
  const [kanjiMatchB, setKanjiMatchB] = useState('meaning');
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState(null);
  const [highScore, setHighScore] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => { fetchSets(); fetchAllVocabs(); fetchKanjiSets(); }, [fetchSets, fetchAllVocabs, fetchKanjiSets]);

  useEffect(() => {
    setBestTime(localStorage.getItem(`matchBest_${selectedSetId}_${difficulty}_${contentType}`) || null);
    setHighScore(localStorage.getItem(`matchScore_${selectedSetId}_${contentType}`) || null);
  }, [selectedSetId, difficulty, contentType]);
  
  const [isStarted, setIsStarted] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [errorCards, setErrorCards] = useState([]); 
  const [isAnimating, setIsAnimating] = useState(false); 
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = containerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if (elem?.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true); // Fallback CSS
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
    let interval;
    if (isStarted && !isFinished) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          if (gameMode === 'challenge') {
            if (prev <= 1) { setIsFinished(true); return 0; }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, isFinished, gameMode]);

  useEffect(() => {
    if (cards.length > 0 && matchedIds.length === cards.length / 2) {
      if (gameMode === 'challenge') generateCards(); 
      else {
        setIsFinished(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        vibrate([100, 50, 100, 50, 200]);
        const key = `matchBest_${selectedSetId}_${cards.length / 2}_${contentType}`;
        if (!bestTime || timeElapsed < bestTime) {
          localStorage.setItem(key, timeElapsed);
          setBestTime(timeElapsed);
          toast.success(`🎉 Kỷ lục mới: ${timeElapsed} giây!`);
        }
      }
    }
  }, [matchedIds, cards, gameMode, timeElapsed, bestTime, selectedSetId, contentType]);

  useEffect(() => {
    if (isFinished && gameMode === 'challenge') {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      vibrate([100, 50, 100, 50, 200]);
      if (!highScore || score > highScore) {
        localStorage.setItem(`matchScore_${selectedSetId}_${contentType}`, score);
        setHighScore(score);
        toast.success(`🏆 Điểm cao mới: ${score} điểm!`);
      }
    }
  }, [isFinished, gameMode, score, highScore, selectedSetId, contentType]);

  const getCardTexts = (vocab) => {
    if (contentType === 'kanji') return [vocab[kanjiMatchA], vocab[kanjiMatchB]];
    return [vocab.word, vocab.meaning];
  };

  const generateCards = async () => {
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

    const actualDifficulty = Math.min(difficulty, pool.length);
    const pivotIndex = Math.floor(Math.random() * pool.length);
    const pivotWord = pool[pivotIndex] || pool[0];
    
    const scoredPool = pool.map(v => {
      let sc = v.id === pivotWord.id ? 999 : 0;
      const currentText = contentType === 'kanji' ? pivotWord[kanjiMatchA] : pivotWord.word;
      const vText = contentType === 'kanji' ? v[kanjiMatchA] : v.word;
      if (currentText && vText) {
        currentText.split('').forEach(c => { if (vText.includes(c)) sc += 1; });
      }
      return { ...v, score: sc + Math.random() };
    }).sort((a, b) => b.score - a.score);
    
    const initialCards = [];
    scoredPool.slice(0, actualDifficulty).forEach(vocab => {
      const [text1, text2] = getCardTexts(vocab);
      initialCards.push({ id: `cardA-${vocab.id}-${Date.now()}`, matchId: vocab.id, text: text1 });
      initialCards.push({ id: `cardB-${vocab.id}-${Date.now()}`, matchId: vocab.id, text: text2 });
    });
    setCards(initialCards.sort(() => 0.5 - Math.random()));
    setMatchedIds([]);
  };

  const startGame = async () => {
    let poolLength = 0;
    if (selectedSetId === 'all') {
      poolLength = contentType === 'kanji' ? kanjiSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0) : allVocabs.length;
    } else {
      if (contentType === 'kanji') {
        const targetSet = kanjiSets.find(s => s.id === parseInt(selectedSetId));
        poolLength = targetSet ? (targetSet.vocab_count || 0) : 0;
      } else {
        const targetSet = sets.find(s => s.id === parseInt(selectedSetId));
        poolLength = targetSet ? (targetSet.vocab_count || 0) : 0;
      }
    }

    if (poolLength < 2) return toast.warning(`Cần ít nhất 2 thẻ để chơi!`);

    await generateCards();
    setSelectedCards([]);
    setErrorCards([]);
    setIsAnimating(false);
    setTimeElapsed(gameMode === 'challenge' ? 60 : 0);
    setScore(0);
    setCombo(0);
    setLastMatchTime(null);
    setIsFinished(false);
    setIsStarted(true);
    if (!isFullscreen) toggleFullscreen();
  };

  const handleCardClick = (card) => {
    if (isAnimating || matchedIds.includes(card.matchId) || selectedCards.length === 2 || selectedCards.find(c => c.id === card.id)) return;
    vibrate(20);

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setIsAnimating(true); 
      if (newSelected[0].matchId === newSelected[1].matchId) {
        vibrate(50);
        const now = Date.now();
        let newCombo = 1;
        if (lastMatchTime && (now - lastMatchTime < 2500)) newCombo = combo + 1; 
        
        setCombo(newCombo);
        setScore(s => s + (10 * newCombo));
        setLastMatchTime(now);

        setTimeout(() => {
          setMatchedIds(prev => [...prev, newSelected[0].matchId]);
          setSelectedCards([]);
          setIsAnimating(false); 
        }, 300);
      } else {
        vibrate([100, 50, 100]);
        setCombo(0); 
        setErrorCards([newSelected[0].id, newSelected[1].id]);
        setTimeout(() => {
          setSelectedCards([]);
          setErrorCards([]);
          setIsAnimating(false); 
        }, 800);
      }
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-5 fade-in-slide" style={{ maxWidth: '500px' }}>
        <div className="card shadow-sm border-0 p-4 rounded-4">
          <h3 className="text-center mb-4 fw-bold">Game Ghép Thẻ</h3>
          <div className="mb-3">
            <label className="form-label fw-bold text-muted">Chế độ chơi:</label>
            <div className="d-flex gap-2">
              <button className={`btn w-50 fw-bold ${gameMode === 'normal' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setGameMode('normal')}>Thường</button>
              <button className={`btn w-50 fw-bold ${gameMode === 'challenge' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setGameMode('challenge')}>Thử thách 60s</button>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold text-muted">Chọn loại nội dung:</label>
            <ContentTypeSelector contentType={contentType} setContentType={setContentType} />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold text-muted">Chọn học phần:</label>
            <SetSelector sets={contentType === 'kanji' ? kanjiSets : sets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} />
          </div>

          {contentType === 'kanji' && (
            <div className="mb-3">
              <label className="form-label fw-bold text-muted">Cặp thẻ muốn ghép:</label>
              <div className="d-flex align-items-center justify-content-center gap-2 bg-light p-2 rounded-4 shadow-sm">
                <select className="form-select bg-white border-0 fw-bold shadow-sm text-center text-primary" value={kanjiMatchA} onChange={(e) => setKanjiMatchA(e.target.value)}>
                  <option value="kanji" className="text-dark">Hán tự</option>
                  <option value="hanviet" className="text-dark">Hán Việt</option>
                  <option value="hiragana" className="text-dark">Phiên âm</option>
                  <option value="meaning" className="text-dark">Ý nghĩa</option>
                </select>
                <span className="fw-bold text-muted">↔</span>
                <select className="form-select bg-white border-0 fw-bold shadow-sm text-center text-success" value={kanjiMatchB} onChange={(e) => setKanjiMatchB(e.target.value)}>
                  <option value="kanji" className="text-dark">Hán tự</option>
                  <option value="hanviet" className="text-dark">Hán Việt</option>
                  <option value="hiragana" className="text-dark">Phiên âm</option>
                  <option value="meaning" className="text-dark">Ý nghĩa</option>
                </select>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="form-label fw-bold text-muted">Độ khó (Số cặp thẻ):</label>
            <input type="number" className="form-control bg-light border-0 fw-bold text-center text-dark" value={difficulty} min={2} onChange={(e) => setDifficulty(parseInt(e.target.value) || 2)} />
          </div>

          {gameMode === 'normal' && bestTime !== null && <div className="alert alert-info text-center fw-bold shadow-sm border-0 mb-4 rounded-3">🏆 Kỷ lục tốc độ: {bestTime} giây</div>}
          {gameMode === 'challenge' && highScore !== null && <div className="alert alert-warning text-center fw-bold shadow-sm border-0 mb-4 rounded-3">🏆 Điểm cao nhất: {highScore} điểm</div>}
          
          <button className={`btn btn-lg w-100 fw-bold shadow-sm ${gameMode === 'challenge' ? 'btn-danger' : 'btn-primary'}`} onClick={startGame}>Bắt đầu chơi</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-fluid py-4 text-center transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      
      {showExitModal && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 text-center" style={{ width: '90%', maxWidth: '400px' }}>
            <h4 className="fw-bold text-danger mb-3">Cảnh báo</h4>
            <p className="text-dark mb-4 fs-5">Bạn đang trong ván chơi. Nếu thoát bây giờ sẽ mất toàn bộ tiến trình và điểm số. Chắc chắn thoát?</p>
            <div className="d-flex gap-3">
              <button className="btn btn-danger fw-bold w-50 py-2 rounded-3" onClick={() => { setShowExitModal(false); setIsStarted(false); setIsFullscreen(false); }}>Thoát luôn</button>
              <button className="btn btn-secondary fw-bold w-50 py-2 rounded-3" onClick={() => setShowExitModal(false)}>Tiếp tục chơi</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto" style={{ maxWidth: '900px', width: '100%' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button className="btn btn-light rounded-circle shadow-sm border-0" onClick={toggleFullscreen} title="Toàn màn hình">
            {isFullscreen ? '↙️' : '⛶'}
          </button>

          <h4 className="fw-bold m-0 text-center flex-grow-1">
            {gameMode === 'challenge' ? 'Còn lại: ' : 'Thời gian: '}
            <span className={gameMode === 'challenge' && timeElapsed <= 10 ? 'text-danger shake d-inline-block' : 'text-primary'}>{timeElapsed}s</span>
          </h4>
          
          <button className="btn btn-outline-secondary fw-bold shadow-sm" onClick={() => setShowExitModal(true)}>Thoát</button>
        </div>

        {gameMode === 'challenge' && (
          <div className="mb-4 d-flex flex-column align-items-center gap-2 position-relative">
            <div className="d-flex align-items-center gap-3">
              <h4 className="fw-bold m-0 border px-4 py-2 rounded-pill bg-white shadow-sm">
                Điểm: <span className="text-success">{score}</span>
              </h4>
              {combo > 1 && (
                <div className="position-relative">
                  <span className="badge rounded-pill bg-danger fs-5 px-3 py-2 fade-in shadow-sm streak-glow">
                    Combo x{combo} 🔥
                  </span>
                  <div className="position-absolute top-100 start-50 translate-middle-x mt-2 w-100 overflow-hidden rounded-pill" style={{ height: '6px', backgroundColor: 'rgba(220,53,69,0.2)' }}>
                    <div key={combo} className="bg-danger h-100 combo-timer-bar rounded-pill"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isFinished ? (
          <div className="card shadow-lg border-0 p-5 mt-4 rounded-4 fade-in-slide mx-auto bg-white" style={{ maxWidth: '600px' }}>
            <h2 className="text-success fw-bold mb-3">🎉 Tuyệt vời!</h2>
            {gameMode === 'normal' ? (
              <p className="fs-5 text-muted mb-4">Bạn đã hoàn thành trong <strong className="text-dark">{timeElapsed} giây</strong>.</p>
            ) : (
              <p className="fs-5 text-muted mb-4">Tổng điểm của bạn: <strong className="text-danger fs-3">{score}</strong></p>
            )}
            <button className={`btn btn-lg mt-2 fw-bold w-100 shadow-sm ${gameMode === 'challenge' ? 'btn-danger' : 'btn-primary'}`} onClick={startGame}>Chơi lại</button>
          </div>
        ) : (
          <div className="row g-3 px-2">
            {cards.map(card => {
              const isSelected = selectedCards.some(c => c.id === card.id);
              const isMatched = matchedIds.includes(card.matchId);
              const isError = errorCards.includes(card.id);
              
              if (isMatched) {
                return (
                  <div className="col-6 col-md-4 col-lg-3" key={card.id}>
                    <div className="card h-100 border-0 bg-transparent" style={{ opacity: 0, cursor: 'default' }}><div className="card-body p-4"></div></div>
                  </div>
                );
              }

              let cardClasses = 'bg-white text-dark hover-bg-light';
              let cardStyles = { cursor: 'pointer', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid transparent' };
              if (isSelected) { cardClasses = 'bg-primary text-white'; cardStyles.border = '3px solid var(--bs-primary)'; }
              if (isError) { cardClasses = 'bg-danger text-white shake'; cardStyles.border = '3px solid #dc3545'; }

              return (
                <div className="col-6 col-md-4 col-lg-3" key={card.id}>
                  <div className={`card h-100 shadow-sm transition-all rounded-4 ${cardClasses}`} style={cardStyles} onClick={() => handleCardClick(card)}>
                    <div className="card-body d-flex align-items-center justify-content-center p-3 text-wrap" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{card.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchMode;