import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio'; // Import âm thanh
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';

const CHUNK_SIZE = 7;

function LearnMode() {
  const { sets, setSets, allVocabs, kanjiSets, setKanjiSets, loading, fetchSets, fetchAllVocabs, fetchKanjiSets } = useContext(VocabContext);
  const [contentType, setContentType] = useState('vocab');
  const [selectedSetId, setSelectedSetId] = useState('all');

  useEffect(() => { fetchSets(); fetchAllVocabs(); fetchKanjiSets(); }, [fetchSets, fetchAllVocabs, fetchKanjiSets]);

  const [isStarted, setIsStarted] = useState(false);
  const [isReversed, setIsReversed] = useState(false); 
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('meaning');
  
  const [rounds, setRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentRoundWords, setCurrentRoundWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mode, setMode] = useState('choice'); 
  const [options, setOptions] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [isShaking, setIsShaking] = useState(false);
  const [onlyDue, setOnlyDue] = useState(false); 

  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0); 
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const srsAnsweredRefs = useRef(new Set());

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

  const handleExit = () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false);
    setIsStarted(false);
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

  const getFrontLabel = () => {
    if (contentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiFront];
    }
    return isReversed ? 'Ý nghĩa' : 'Từ vựng';
  };

  const getBackLabel = () => {
    if (contentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiBack];
    }
    return isReversed ? 'Từ vựng' : 'Ý nghĩa';
  };

  const getQuestionText = (vocab) => {
    if (!vocab) return "";
    return contentType === 'kanji' ? vocab[kanjiFront] : (isReversed ? vocab.meaning : vocab.word);
  };

  const getAnswerText = (vocab) => {
    if (!vocab) return "";
    return contentType === 'kanji' ? vocab[kanjiBack] : (isReversed ? vocab.word : vocab.meaning);
  };

  const handleSwap = () => {
    if (contentType === 'kanji') {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  const updateSRS = async (vocabId, isCorrect) => {
    if (contentType === 'kanji') return; // Kanji chưa có SRS
    if (srsAnsweredRefs.current.has(vocabId)) return;
    srsAnsweredRefs.current.add(vocabId);
    try { await api.put(`/vocabularies/${vocabId}/srs`, { is_correct: isCorrect }); } 
    catch (err) { console.error("Lỗi cập nhật SRS:", err); }
  };

  const playAudio = (text, type = 'normal') => {
    if (!text) return;
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    if (!hasJapanese) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = type === 'error' ? 0.8 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

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

    if (onlyDue) {
      if (contentType === 'kanji') {
        return toast.warning("Chế độ ôn tập đến hạn (SRS) chưa hỗ trợ cho Kanji!");
      }
      const now = new Date();
      pool = pool.filter(v => v.next_review && new Date(v.next_review) <= now);
      if (pool.length === 0) return toast.success("Tuyệt vời! Không có từ vựng nào đến hạn.");
    }

    if (pool.length === 0) return toast.warning("Học phần này chưa có dữ liệu phù hợp!");

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const chunked = [];
    for (let i = 0; i < shuffled.length; i += CHUNK_SIZE) chunked.push(shuffled.slice(i, i + CHUNK_SIZE));
    
    setRounds(chunked);
    setCurrentRoundIndex(0);
    setCurrentWordIndex(0);
    setMode('choice');
    setCurrentRoundWords([...chunked[0]]);
    
    const allData = contentType === 'kanji' ? kanjiSets.flatMap(s => s.kanjis || []) : allVocabs;
    generateOptions(chunked[0][0], allData);
    setStreak(0);
    setMaxStreak(0);
    srsAnsweredRefs.current.clear();
    setIsStarted(true);
    setIsFinished(false);
    if (!isFullscreen) toggleFullscreen();
  };

  const generateOptions = (currentWord, allData) => {
    if (!currentWord) return;
    const currentText = contentType === 'kanji' ? currentWord[kanjiBack] : currentWord.word;

    const scoredAnswers = allData.filter(v => v.id !== currentWord.id).map(v => {
      let score = 0;
      const vText = contentType === 'kanji' ? v[kanjiBack] : v.word;
      if (currentText && vText) {
        currentText.split('').forEach(c => { if (vText.includes(c)) score += 1; });
      }
      return { ...v, score: score + Math.random() * 0.5 };
    });
    scoredAnswers.sort((a, b) => b.score - a.score);

    const normalizeStr = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
    const correctAnswerStr = getAnswerText(currentWord);
    const normalizedCorrect = normalizeStr(correctAnswerStr);
    const usedAnswers = new Set([normalizedCorrect]);
    
    let wrongOptions = [];
    for (let i = 0; i < scoredAnswers.length; i++) {
      const rawAns = getAnswerText(scoredAnswers[i]);
      const normAns = normalizeStr(rawAns);
      if (!usedAnswers.has(normAns) && normAns !== "") {
        wrongOptions.push(scoredAnswers[i]);
        usedAnswers.add(normAns);
      }
      if (wrongOptions.length === 3) break;
    }
    
    if (wrongOptions.length < 3) {
       const backupVocabs = [...allData].sort(() => 0.5 - Math.random());
       for (let i = 0; i < backupVocabs.length; i++) {
          if (backupVocabs[i].id === currentWord.id) continue;
          const rawAns = getAnswerText(backupVocabs[i]);
          const normAns = normalizeStr(rawAns);
          if (!usedAnswers.has(normAns) && normAns !== "") {
            wrongOptions.push(backupVocabs[i]);
            usedAnswers.add(normAns);
          }
          if (wrongOptions.length === 3) break;
       }
    }

    const choices = [...wrongOptions, currentWord].sort(() => 0.5 - Math.random());
    setOptions(choices);
  };

  const handleNextAfterFeedback = () => {
    setFeedback(null);
    setInputText('');
    const allData = contentType === 'kanji' ? kanjiSets.flatMap(s => s.kanjis || []) : allVocabs;

    if (currentWordIndex < currentRoundWords.length - 1) {
      const nextWord = currentRoundWords[currentWordIndex + 1];
      setCurrentWordIndex(currentWordIndex + 1);
      if (mode === 'choice') generateOptions(nextWord, allData);
    } else {
      const goToNextRound = () => {
        if (currentRoundIndex < rounds.length - 1) {
          const nextRoundIdx = currentRoundIndex + 1;
          setCurrentRoundIndex(nextRoundIdx);
          setCurrentWordIndex(0);
          setMode('choice');
          setCurrentRoundWords([...rounds[nextRoundIdx]]);
          generateOptions(rounds[nextRoundIdx][0], allData);
        } else {
          setIsFinished(true);
          playSound('win');
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          vibrate([100, 50, 100, 50, 200]); 
        }
      };

      if (mode === 'choice') {
        const typingWords = rounds[currentRoundIndex];
        if (typingWords.length > 0) {
          setMode('typing');
          setCurrentWordIndex(0);
          setCurrentRoundWords([...typingWords]);
        } else {
          // Nếu tất cả từ đều bị sai ở phần trắc nghiệm -> bỏ qua vòng tự luận, đi thẳng sang Round mới
          goToNextRound();
        }
      } else {
        goToNextRound();
      }
    }
  };

  const handleWrongAnswer = (currentWord, correctAnswerText, userAnsText) => {
    playSound('wrong'); 
    vibrate([200, 100, 200]); 
    setStreak(0);
    updateSRS(currentWord.id, false);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    
    // Cơ chế Quizlet: Đẩy câu sai sang Round kế tiếp
    setRounds(prev => {
      const newRounds = [...prev];
      // Xóa từ này khỏi round hiện tại để vòng tự luận (typing) phía sau không hỏi lại
      newRounds[currentRoundIndex] = newRounds[currentRoundIndex].filter(w => w.id !== currentWord.id);
      
      // Đẩy vào round kế tiếp (hoặc tạo round mới nếu đang ở round cuối cùng)
      if (currentRoundIndex < newRounds.length - 1) {
        newRounds[currentRoundIndex + 1] = [...newRounds[currentRoundIndex + 1], currentWord];
      } else {
        newRounds.push([currentWord]);
      }
      return newRounds;
    });
    
    setFeedback({ isCorrect: false, correctAnswer: correctAnswerText, yourAnswer: userAnsText });
    playAudio(correctAnswerText, 'error');
  };

  const handleCorrectAnswer = (currentWord) => {
    playSound('correct'); // Tiếng ting đúng
    vibrate(40);
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > maxStreak) setMaxStreak(newStreak);
    updateSRS(currentWord.id, true);
    handleNextAfterFeedback();
  };

  const handleChoiceSubmit = (selectedOption) => {
    const currentWord = currentRoundWords[currentWordIndex];
    if (selectedOption.id === currentWord.id) {
      handleCorrectAnswer(currentWord);
    } else {
      const correctAnsStr = getAnswerText(currentWord);
      const userAnsStr = getAnswerText(selectedOption);
      handleWrongAnswer(currentWord, correctAnsStr, userAnsStr);
    }
  };

  const checkFuzzyMatch = (input, correctStr) => {
    if(!correctStr) return false;
    const clean = (str) => str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim().toLowerCase();
    if (clean(input) === clean(correctStr)) return true;
    return correctStr.split(',').map(s => clean(s)).includes(clean(input));
  };

  const handleTypeSubmit = (e) => {
    e.preventDefault();
    const currentWord = currentRoundWords[currentWordIndex];
    const correctAnsStr = getAnswerText(currentWord);
    
    if (checkFuzzyMatch(inputText, correctAnsStr)) {
      handleCorrectAnswer(currentWord);
    } else {
      handleWrongAnswer(currentWord, correctAnsStr, inputText.trim() || "(Để trống)");
    }
  };

  const handleDontKnow = () => {
    const currentWord = currentRoundWords[currentWordIndex];
    handleWrongAnswer(currentWord, getAnswerText(currentWord), "Không biết 🤷‍♂️");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isStarted && !isFinished && !feedback && mode === 'choice') {
        const key = parseInt(e.key);
        if (key >= 1 && key <= options.length) {
          handleChoiceSubmit(options[key - 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, feedback, mode, options, currentRoundWords, currentWordIndex]);

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-5 fade-in-slide" style={{ maxWidth: '650px' }}>
        <div className="card shadow-sm border-0 p-4 p-md-5 rounded-4 bg-white" style={{ borderRadius: '24px' }}>
          <h3 className="text-center mb-5 fw-bold text-dark">Cài đặt Chế độ Học</h3>
          
          <div className="mb-4">
            <label className="form-label fw-bold text-muted mb-2">1. Chọn loại nội dung:</label>
            <ContentTypeSelector contentType={contentType} setContentType={setContentType} />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold text-muted mb-2">2. Chọn học phần muốn học:</label>
            <SetSelector sets={contentType === 'kanji' ? kanjiSets : sets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} />
          </div>

          <div className="mb-4 text-start">
            <div className="form-check form-switch fs-6 d-flex align-items-center gap-3 bg-light p-3 rounded-4 border-0 shadow-sm">
              <input className="form-check-input m-0 shadow-sm" type="checkbox" id="srsToggle" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label className="form-check-label fw-bold text-dark m-0" htmlFor="srsToggle" style={{ cursor: 'pointer' }}>Chỉ ôn tập từ đến hạn (Cơ chế Spaced Repetition)</label>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between bg-light p-3 rounded-4 border-0 mb-5 shadow-sm transition-all">
            <div className="text-center" style={{ flex: 1, minWidth: 0 }}>
              <span className="text-muted small fw-bold d-block mb-1 text-truncate">HỆ THỐNG HỎI</span>
              {contentType === 'kanji' ? (
                  <select className="form-select bg-white border-0 fw-bold shadow-sm text-center mx-auto mt-1" style={{ color: '#8a2be2', maxWidth: '140px' }} value={kanjiFront} onChange={(e) => setKanjiFront(e.target.value)}>
                    <option value="kanji" className="text-dark">Hán tự</option>
                    <option value="hanviet" className="text-dark">Hán Việt</option>
                    <option value="hiragana" className="text-dark">Phiên âm</option>
                    <option value="meaning" className="text-dark">Ý nghĩa</option>
                  </select>
              ) : (
                  <span className="fw-bold fs-5 text-truncate d-block mt-2" style={{ color: '#8a2be2' }}>{getFrontLabel()}</span>
              )}
            </div>
            
            <div className="px-2 px-md-3" style={{ flexShrink: 0 }}>
              <button 
                type="button"
                className="btn btn-warning rounded-circle shadow-sm fw-bold d-flex align-items-center justify-content-center transition-all hover-scale m-0" 
                style={{width: '48px', height: '48px', fontSize: '1.2rem'}}
                onClick={handleSwap}
                title="Đảo chiều câu hỏi"
              >
                🔄
              </button>
            </div>
            
            <div className="text-center" style={{ flex: 1, minWidth: 0 }}>
              <span className="text-muted small fw-bold d-block mb-1 text-truncate">BẠN TRẢ LỜI</span>
              {contentType === 'kanji' ? (
                  <select className="form-select bg-white border-0 fw-bold shadow-sm text-center mx-auto mt-1 text-success" style={{ maxWidth: '140px' }} value={kanjiBack} onChange={(e) => setKanjiBack(e.target.value)}>
                    <option value="kanji" className="text-dark">Hán tự</option>
                    <option value="hanviet" className="text-dark">Hán Việt</option>
                    <option value="hiragana" className="text-dark">Phiên âm</option>
                    <option value="meaning" className="text-dark">Ý nghĩa</option>
                  </select>
              ) : (
                  <span className="fw-bold text-success fs-5 text-truncate d-block mt-2">{getBackLabel()}</span>
              )}
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-100 fw-bold shadow-lg" style={{ borderRadius: '14px', padding: '15px', backgroundColor: '#8a2be2', border: 'none' }} onClick={handleStart}>
            Bắt đầu vắt óc 🧠
          </button>
        </div>
      </div>
    );
  }

  const currentWord = currentRoundWords[currentWordIndex];
  const questionText = getQuestionText(currentWord);
  const modeOffset = mode === 'choice' ? 0 : 0.5;
  const wordProgress = currentRoundWords.length > 0 ? (currentWordIndex / currentRoundWords.length) * 0.5 : 0;
  const progressPercent = Math.round(((currentRoundIndex + modeOffset + wordProgress) / rounds.length) * 100) || 0;

  return (
    <div className={`container-fluid py-4 transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      <div className="mx-auto" style={{ maxWidth: '650px', width: '100%' }}>
        
        {!isFinished && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button className="btn btn-light rounded-circle shadow-sm border-0 d-print-none hover-bg-light transition-all" onClick={toggleFullscreen} title="Toàn màn hình (F)">
                {isFullscreen ? '↙️' : '⛶'}
              </button>
              <div className="d-flex align-items-center gap-3 fw-bold text-muted">
                {streak > 0 && (
                  <div className="streak-indicator d-flex align-items-center bg-white rounded-pill shadow-sm border overflow-hidden fade-in" style={{ height: '38px', borderColor: streak >= 5 ? '#dc3545' : '#ffc107' }}>
                    <div className={`px-3 h-100 d-flex align-items-center fw-bold fs-6 text-white ${streak >= 5 ? 'bg-danger streak-glow' : 'bg-warning text-dark'}`}>
                      🔥 {streak}
                    </div>
                    <div className="d-flex align-items-center gap-1 px-2" style={{ width: '70px' }}>
                      {[...Array(5)].map((_, i) => {
                        const isActive = i < (streak > 0 ? ((streak - 1) % 5) + 1 : 0);
                        return (
                          <div 
                            key={i} 
                            className={`rounded-pill ${isActive ? (streak >= 5 ? 'bg-danger' : 'bg-warning') : 'bg-light'}`} 
                            style={{ height: '6px', flexGrow: 1, transition: 'all 0.3s ease', transform: isActive ? 'scaleY(1.5)' : 'scaleY(1)' }}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <span className="fs-5">{progressPercent}%</span>
              </div>
            </div>
            <div className="progress mb-4 shadow-sm" style={{ height: '10px', borderRadius: '10px' }}>
              <div className="progress-bar" role="progressbar" style={{ width: `${progressPercent}%`, transition: 'width 0.4s ease', backgroundColor: '#8a2be2' }}></div>
            </div>
          </>
        )}
        
        {isFinished ? (
          <div className="card shadow-lg border-0 p-5 rounded-4 fade-in-slide mx-auto bg-white">
            <div className="display-1 mb-3 text-center">🏆</div>
            <h2 className="fw-bold text-success mb-3 text-center">Bài học hoàn tất!</h2>
            <p className="fs-5 text-muted mb-4 text-center">Bạn vừa hoàn thành một phiên vắt óc rất chất lượng.</p>
            
            <div className="row g-3 mb-5">
              <div className="col-6">
                <div className="bg-light p-4 rounded-4 h-100 border border-warning text-center" style={{ borderWidth: '2px !important' }}>
                  <h2 className="fw-bold text-warning mb-0">🔥 {maxStreak}</h2>
                  <span className="fw-bold text-muted small">CHUỖI DÀI NHẤT</span>
                </div>
              </div>
              <div className="col-6">
                <div className="bg-light p-4 rounded-4 h-100 border text-center" style={{ borderColor: '#8a2be2', borderWidth: '2px !important' }}>
                  <h2 className="fw-bold mb-0" style={{ color: '#8a2be2' }}>⚡ {rounds.flat().length * 10}</h2>
                  <span className="fw-bold text-muted small">ĐIỂM KINH NGHIỆM</span>
                </div>
              </div>
            </div>
            <button className="btn btn-lg fw-bold w-100 shadow-sm text-white hover-scale" style={{ backgroundColor: '#8a2be2' }} onClick={handleExit}>Hoàn thành & Quay lại</button>
          </div>
        ) : (
          <div className={`card shadow-sm border-0 rounded-4 fade-in-slide ${isShaking ? 'shake border border-danger' : ''}`} key={`${currentRoundIndex}-${currentWordIndex}-${mode}-${feedback ? 'fb' : 'q'}`}>
            <div className="card-body p-4 p-md-5">
              {feedback ? (
                <div className="text-center">
                  <h5 className="text-danger fw-bold mb-4">❌ Chưa chính xác! Từ này sẽ được hỏi lại.</h5>
                  <div className="p-4 mb-4 bg-light rounded-4 text-start border-start border-danger border-4 shadow-sm">
                    <p className="mb-2"><strong>Câu hỏi:</strong> <span className="fs-5" style={{ color: '#8a2be2' }}>{questionText}</span></p>
                    <p className="text-muted mb-3"><strong>Bạn chọn/gõ:</strong> <span className="text-decoration-line-through">{feedback.yourAnswer}</span></p>
                    <p className="text-success fs-4 mb-0 fw-bold d-flex align-items-center">
                      ✓ {feedback.correctAnswer}
                      <button className="btn btn-sm btn-light rounded-circle ms-3 shadow-sm border transition-all hover-bg-light" onClick={() => playAudio(feedback.correctAnswer)} title="Nghe lại">🔊</button>
                    </p>
                  </div>
                  <button className="btn btn-primary btn-lg fw-bold w-100 mt-2 shadow-sm text-white hover-scale" style={{ backgroundColor: '#8a2be2' }} onClick={handleNextAfterFeedback} autoFocus>Đã hiểu, tiếp tục</button>
                </div>
              ) : (
                <div className="text-center">
                  <span className="badge bg-light text-muted border mb-3 fw-bold px-3 py-2 fs-6 shadow-sm">
                    {mode === 'choice' ? 'Chọn đáp án đúng' : 'Gõ đáp án chính xác'}
                  </span>
                  
                  <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                    <h3 className="text-dark fw-bold m-0" style={{ fontSize: '2.5rem' }}>{questionText}</h3>
                    <button className="btn btn-light rounded-circle shadow-sm transition-all hover-bg-light" onClick={() => playAudio(questionText)} title="Phát âm">🔊</button>
                  </div>
                  
                  {mode === 'choice' ? (
                    <div className="d-flex flex-column gap-3 mt-4">
                      {options.map((opt, i) => (
                        <button 
                          key={opt.id} 
                          className="btn btn-light border py-3 text-start px-4 fs-5 fw-bold hover-bg-light transition-all d-flex align-items-center shadow-sm" 
                          style={{ borderRadius: '12px' }}
                          onClick={() => handleChoiceSubmit(opt)}
                        >
                          <span className="badge bg-secondary me-3" style={{ opacity: 0.6 }}>{i + 1}</span>
                          {getAnswerText(opt)}
                        </button>
                      ))}
                      <div className="mt-3 text-end">
                        <button className="btn btn-link text-muted fw-bold text-decoration-none border-0 hover-scale" onClick={handleDontKnow}>Tôi không biết câu này 🤷‍♂️</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleTypeSubmit} className="mt-4">
                      <div className="position-relative mb-4">
                        <input 
                          type="text" 
                          className="form-control form-control-lg text-center py-4 bg-light fw-bold shadow-sm" 
                          placeholder={`Nhập ${getBackLabel().toLowerCase()} vào đây...`}
                          value={inputText} onChange={(e) => setInputText(e.target.value)} autoComplete="off" autoFocus
                          style={{ fontSize: '1.5rem', borderRadius: '16px', border: '2px solid #dee2e6' }}
                        />
                      </div>
                      <div className="d-flex gap-3">
                        <button type="button" className="btn btn-outline-secondary w-50 py-3 fs-5 fw-bold border hover-bg-light shadow-sm rounded-4" onClick={handleDontKnow}>Bỏ qua</button>
                        <button type="submit" className="btn w-50 py-3 fs-5 fw-bold shadow-sm rounded-4 text-white hover-scale" style={{ backgroundColor: '#8a2be2' }}>Kiểm tra</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LearnMode;