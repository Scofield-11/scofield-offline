import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio'; // Import âm thanh
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';
import GameModeSelector from './GameModeSelector';

const CHUNK_SIZE = 7;

function LearnMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');
  const [allData, setAllData] = useState([]); 

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    const idStr = String(selectedSetId);
    if (idStr.startsWith('lang_') || idStr.startsWith('all_')) {
      const lang = idStr.replace('lang_', '').replace('all_', '');
      if (lang === 'kanji') return sets.filter(s => s.type === 'kanji');
      if (lang === 'en') return sets.filter(s => s.type !== 'kanji' && s.language === 'en');
      return sets.filter(s => s.type !== 'kanji' && (s.language || 'ja') === 'ja');
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      return sets.filter(s => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    }
    const targetSet = sets.find(s => s.id == selectedSetId);
    return targetSet ? [targetSet] : [];
  }, [selectedSetId, sets]);

  const currentContentType = (targetSets.length > 0 && targetSets.every(s => s.type === 'kanji')) ? 'kanji' : 'vocab';

  useEffect(() => { fetchSets(); }, [fetchSets]);

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
    if (currentContentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiFront];
    }
    return isReversed ? 'Ý nghĩa' : 'Từ vựng';
  };

  const getBackLabel = () => {
    if (currentContentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiBack];
    }
    return isReversed ? 'Từ vựng' : 'Ý nghĩa';
  };

  const hasFourFields = (() => {
    if (currentContentType === 'kanji') return true;
    if (String(selectedSetId) === 'lang_ja' || String(selectedSetId) === 'all_ja') return true;
    if (targetSets.length > 0) {
      return targetSets.some(s => s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana));
    }
    return false;
  })();

  const getQuestionText = (vocab) => {
    if (!vocab) return "";
    let front = currentContentType === 'kanji' ? kanjiFront : (hasFourFields ? (kanjiFront === 'kanji' ? 'word' : kanjiFront) : (isReversed ? 'meaning' : 'word'));
    if (!vocab[front] && (front === 'hanviet' || front === 'hiragana')) front = 'word';
    return vocab[front] || "";
  };

  const getAnswerText = (vocab) => {
    if (!vocab) return "";
    let back = currentContentType === 'kanji' ? kanjiBack : (hasFourFields ? (kanjiBack === 'meaning' && kanjiFront === 'kanji' ? 'meaning' : (kanjiBack === 'kanji' ? 'word' : kanjiBack)) : (isReversed ? 'word' : 'meaning'));
    if (!vocab[back] && (back === 'hanviet' || back === 'hiragana')) back = 'meaning';
    return vocab[back] || "";
  };


  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  const updateSRS = async (vocabId, isCorrect) => {
    if (currentContentType === 'kanji') return; // Kanji chưa có SRS
    if (srsAnsweredRefs.current.has(vocabId)) return;
    srsAnsweredRefs.current.add(vocabId);
    try { await api.put(`/vocabularies/${vocabId}/srs`, { is_correct: isCorrect }); } 
    catch (err) { console.error("Lỗi cập nhật SRS:", err); }
  };

  const playAudio = (text, type = 'normal', isEn = false) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isEn ? 'en-US' : 'ja-JP';
      utterance.rate = type === 'error' ? 0.8 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStart = async () => {
    let pool = [];

    if (targetSets.length === 0) return toast.warning("Không có học phần nào phù hợp!");

    toast.info("Đang tải dữ liệu...", { autoClose: 1000 });
    const fullSets = await Promise.all(targetSets.map(async (s) => {
      if (s.vocabularies && s.vocabularies.length > 0) return s;
      try {
        const res = await api.get(`/sets/${s.id}`);
        return res.data;
      } catch (e) { return s; }
    }));
    
    setSets(prev => prev.map(p => fullSets.find(fs => fs.id === p.id) || p));
    pool = fullSets.flatMap(s => s.vocabularies || []);

    if (onlyDue) {
      if (currentContentType === 'kanji') {
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
    
    setAllData(pool);
    generateOptions(chunked[0][0], pool);
    setStreak(0);
    setMaxStreak(0);
    srsAnsweredRefs.current.clear();
    setIsStarted(true);
    setIsFinished(false);
    if (!isFullscreen) toggleFullscreen();
  };

  const generateOptions = (currentWord, allData) => {
    if (!currentWord) return;
    const isKatakana = (text) => /^[ァ-ヶー]+$/.test(text || '');
    const currentLang = currentWord.language || 'ja';
    
    let validDistractors = allData.filter(v => {
        if (v.id === currentWord.id) return false;
        if (currentContentType === 'vocab' && (v.language || 'ja') !== currentLang) return false;
        
        const vBack = currentContentType === 'kanji' ? kanjiBack : (hasFourFields ? (kanjiBack === 'meaning' && kanjiFront === 'kanji' ? 'meaning' : (kanjiBack === 'kanji' ? 'word' : kanjiBack)) : (isReversed ? 'word' : 'meaning'));
        if ((vBack === 'hanviet' || vBack === 'hiragana') && !v[vBack]) return false;
        
        return true;
    });

    const maxSampleSize = Math.min(validDistractors.length, 60);
    const sampleVocabs = [...validDistractors].sort(() => 0.5 - Math.random()).slice(0, maxSampleSize);
    const currentText = getAnswerText(currentWord);

    const scoredAnswers = sampleVocabs.map(v => {
        let itemScore = 0;
        const vText = getAnswerText(v);
        
        if (currentText && vText) {
          currentText.split('').forEach(c => { if (vText.includes(c)) itemScore += 1; });
        }
        
        if (currentLang === 'ja' && isKatakana(currentText) && isKatakana(vText)) {
          itemScore += 5;
        }
        
        return { ...v, itemScore: itemScore + Math.random() * 1.5 }; 
    });

    scoredAnswers.sort((a, b) => b.itemScore - a.itemScore);
    
    let wrongAnswers = [];
    const normalizeStr = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
    const normalizedCorrect = normalizeStr(getAnswerText(currentWord));
    const usedNormalizedAnswers = new Set([normalizedCorrect]); 
    
    for (let i = 0; i < scoredAnswers.length; i++) {
      const rawAnsStr = getAnswerText(scoredAnswers[i]);
      const normalizedAns = normalizeStr(rawAnsStr);
      
      if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
        wrongAnswers.push(scoredAnswers[i]);
        usedNormalizedAnswers.add(normalizedAns);
      }
      if (wrongAnswers.length === 3) break;
    }
    
    setOptions([...wrongAnswers, currentWord].sort(() => 0.5 - Math.random()));
  };

  const handleNextAfterFeedback = () => {
    setFeedback(null);
    setInputText('');
    
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
          // Nß║┐u tß║Ñt cß║ú tß╗½ ─æß╗üu bß╗ï sai ß╗ƒ phß║ºn trß║»c nghiß╗çm -> bß╗Å qua v├▓ng tß╗▒ luß║¡n, ─æi thß║│ng sang Round mß╗¢i
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
    
    // C╞í chß║┐ Quizlet: ─Éß║⌐y c├óu sai sang Round kß║┐ tiß║┐p
    setRounds(prev => {
      const newRounds = [...prev];
      // X├│a tß╗½ n├áy khß╗Åi round hiß╗çn tß║íi ─æß╗â v├▓ng tß╗▒ luß║¡n (typing) ph├¡a sau kh├┤ng hß╗Åi lß║íi
      newRounds[currentRoundIndex] = newRounds[currentRoundIndex].filter(w => w.id !== currentWord.id);
      
      // ─Éß║⌐y v├áo round kß║┐ tiß║┐p (hoß║╖c tß║ío round mß╗¢i nß║┐u ─æang ß╗ƒ round cuß╗æi c├╣ng)
      if (currentRoundIndex < newRounds.length - 1) {
        newRounds[currentRoundIndex + 1] = [...newRounds[currentRoundIndex + 1], currentWord];
      } else {
        newRounds.push([currentWord]);
      }
      return newRounds;
    });
    
    setFeedback({ isCorrect: false, correctAnswer: correctAnswerText, yourAnswer: userAnsText });
    playAudio(correctAnswerText, 'error', currentWord.language === 'en');
  };

  const handleCorrectAnswer = (currentWord) => {
    playSound('correct'); // Tiß║┐ng ting ─æ├║ng
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
            <label className="form-label fw-bold text-muted mb-2">1. Chọn học phần muốn học:</label>
            <SetSelector 
              sets={sets} 
              selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} 
            />
          </div>

          <div className="mb-4 text-start">
            <div className="form-check form-switch fs-6 d-flex align-items-center gap-3 bg-light p-3 rounded-4 border-0 shadow-sm">
              <input className="form-check-input m-0 shadow-sm" type="checkbox" id="srsToggle" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label className="form-check-label fw-bold text-dark m-0" htmlFor="srsToggle" style={{ cursor: 'pointer' }}>Chỉ ôn tập từ đến hạn (Cơ chế Spaced Repetition)</label>
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
              sectionLabel="Chọn kỹ năng rèn luyện"
            />
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
    <div className={`container-fluid py-4 transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''} ${isShaking ? 'screen-flash-error' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : { minHeight: '100vh' }}>
      
      {!isFinished && (
        <div className="sticky-top bg-white py-2 z-3 shadow-sm mb-4 rounded-bottom-4 px-3" style={{ top: 0, margin: '-1.5rem -0.75rem 0', transition: 'all 0.3s ease' }}>
          <div className="mx-auto d-flex justify-content-between align-items-center mb-2" style={{ maxWidth: '650px', width: '100%' }}>
            <button className="btn btn-light rounded-circle shadow-sm border-0 d-print-none hover-bg-light transition-all tap-effect" onClick={toggleFullscreen} title="Toàn màn hình (F)">
              {isFullscreen ? '↙️' : '⛶'}
            </button>
            <div className="d-flex align-items-center gap-3 fw-bold text-muted">
              {streak > 0 && (
                <div key={streak} className="streak-indicator d-flex align-items-center bg-white rounded-pill shadow-sm border overflow-hidden streak-pop" style={{ height: '38px', borderColor: streak >= 5 ? '#dc3545' : '#ffc107' }}>
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
              <span className="fs-5 text-primary">{progressPercent}%</span>
            </div>
          </div>
          <div className="progress mx-auto shadow-sm" style={{ height: '12px', borderRadius: '10px', maxWidth: '650px', backgroundColor: '#f0f0f0' }}>
            <div className="progress-bar" role="progressbar" style={{ width: `${progressPercent}%`, transition: 'width 0.4s ease', backgroundColor: '#8a2be2', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'progressGlow 2s infinite linear' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-4" style={{ maxWidth: '650px', width: '100%' }}>
        
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
            <button className="btn btn-lg fw-bold w-100 shadow-sm text-white hover-scale tap-effect" style={{ backgroundColor: '#8a2be2' }} onClick={handleExit}>Hoàn thành & Quay lại</button>
          </div>
        ) : (
          <div className={`card shadow-sm border-0 rounded-4 fade-in-slide ${isShaking ? 'shake border border-danger' : ''}`} key={`${currentRoundIndex}-${currentWordIndex}-${mode}-${feedback ? 'fb' : 'q'}`}>
            <div className="card-body p-4 p-md-5">
              {feedback ? (
                <div className="text-center correct-answer-pop">
                  <div className="mb-3">
                    <span style={{ fontSize: '4rem' }}>😢</span>
                  </div>
                  <h4 className="text-danger fw-bold mb-4">Ối! Sai mất rồi.</h4>
                  <div className="p-4 mb-4 rounded-4 text-start shadow-sm position-relative overflow-hidden" style={{ backgroundColor: '#fff0f0', border: '2px solid #ffcaca' }}>
                    <div className="position-absolute" style={{ top: '-20px', right: '-20px', fontSize: '6rem', opacity: 0.1 }}>❌</div>
                    <p className="mb-2 text-muted fw-bold">KHI HỎI VỀ:</p>
                    <p className="fs-3 fw-bold mb-4" style={{ color: '#8a2be2' }}>{questionText}</p>
                    <hr style={{ borderColor: '#ffcaca' }} />
                    <p className="text-muted mb-2 fw-bold">BẠN ĐÃ CHỌN/GÕ:</p>
                    <p className="text-danger text-decoration-line-through fs-5 mb-4">{feedback.yourAnswer}</p>
                    <p className="text-success mb-1 fw-bold">ĐÁP ÁN ĐÚNG PHẢI LÀ:</p>
                    <div className="d-flex align-items-center bg-white p-3 rounded-3 shadow-sm border border-success">
                      <span className="fs-3 fw-bold text-success me-3">✓</span>
                      <span className="fs-3 fw-bold text-dark flex-grow-1">{feedback.correctAnswer}</span>
                      <button className="btn btn-light rounded-circle shadow-sm border transition-all hover-bg-light tap-effect" onClick={() => playAudio(feedback.correctAnswer, 'normal', currentWord?.language === 'en')} title="Nghe lại" style={{ width: '45px', height: '45px' }}>🔊</button>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-lg fw-bold w-100 mt-2 shadow-sm text-white hover-scale tap-effect" style={{ backgroundColor: '#8a2be2', padding: '15px' }} onClick={handleNextAfterFeedback} autoFocus>Đã hiểu, tiếp tục thôi!</button>
                </div>
              ) : (
                <div className="text-center">
                  <span className="badge bg-light text-muted border mb-3 fw-bold px-3 py-2 fs-6 shadow-sm">
                    {mode === 'choice' ? 'Chọn đáp án đúng' : 'Gõ đáp án chính xác'}
                  </span>
                  
                  <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                    <h3 className="text-dark fw-bold m-0" style={{ fontSize: '2.5rem' }}>{questionText}</h3>
                    <button className="btn btn-light rounded-circle shadow-sm transition-all hover-bg-light tap-effect" onClick={() => playAudio(questionText, 'normal', currentWord?.language === 'en')} title="Phát âm">🔊</button>
                  </div>
                  
                  {mode === 'choice' ? (
                    <div className="d-flex flex-column gap-3 mt-4">
                      {options.map((opt, i) => (
                        <button 
                          key={opt.id} 
                          className="btn btn-light border py-3 text-start px-4 fs-5 fw-bold hover-bg-light transition-all d-flex align-items-center shadow-sm tap-effect" 
                          style={{ borderRadius: '12px' }}
                          onClick={() => handleChoiceSubmit(opt)}
                        >
                          <span className="badge bg-secondary me-3" style={{ opacity: 0.6 }}>{i + 1}</span>
                          {getAnswerText(opt)}
                        </button>
                      ))}
                      <div className="mt-3 text-end">
                        <button className="btn btn-link text-muted fw-bold text-decoration-none border-0 hover-scale tap-effect" onClick={handleDontKnow}>Tôi không biết câu này 🤷‍♂️</button>
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
                        <button type="button" className="btn btn-outline-secondary w-50 py-3 fs-5 fw-bold border hover-bg-light shadow-sm rounded-4 tap-effect" onClick={handleDontKnow}>Bỏ qua</button>
                        <button type="submit" className="btn w-50 py-3 fs-5 fw-bold shadow-sm rounded-4 text-white hover-scale tap-effect" style={{ backgroundColor: '#8a2be2' }}>Kiểm tra</button>
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