import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import TestSetup from './TestSetup';
import TestResult from './TestResult';
import ExamHistoryTable from './ExamHistoryTable';
import SaveNoteModal from './SaveNoteModal';

function TestMode() {
  const { sets, setSets, allVocabs, kanjiSets, setKanjiSets, loading, fetchSets, fetchAllVocabs, fetchKanjiSets } = useContext(VocabContext);
  const [contentType, setContentType] = useState('vocab');
  const [selectedSetId, setSelectedSetId] = useState('all');

  useEffect(() => { fetchSets(); fetchAllVocabs(); fetchKanjiSets(); }, [fetchSets, fetchAllVocabs, fetchKanjiSets]);
  
  const [poolSize, setPoolSize] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const [questionCount, setQuestionCount] = useState(10);
  const [questionFormat, setQuestionFormat] = useState('choice'); 
  
  const [isReversed, setIsReversed] = useState(false); 
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('meaning');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [history, setHistory] = useState([]);
  const [viewHistory, setViewHistory] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const fetchHistory = async (reset = false) => {
    try {
      const skip = reset ? 0 : historyPage * 10;
      const res = await api.get(`/test-history?skip=${skip}&limit=10`);
      if (reset) {
        setHistory(res.data);
        setHistoryPage(1);
      } else {
        setHistory(prev => [...prev, ...res.data]);
        setHistoryPage(prev => prev + 1);
      }
      setHasMoreHistory(res.data.length === 10);
    } catch (error) {
      toast.error("Lỗi tải lịch sử Test!");
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử Test?")) {
      try {
        await api.delete('/test-history/all');
        setHistory([]);
        toast.success("Đã xóa lịch sử thành công!");
      } catch (error) {
        toast.error("Lỗi xóa lịch sử!");
      }
    }
  };

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = containerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true)); // Fallback CSS nếu API bị chặn
      } else if (elem?.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(); // Dành cho iOS Safari cũ
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true); // Fallback toàn bộ bằng CSS cho Mobile
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen(false); // Tắt CSS Fullscreen
      }
    }
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false); // Dọn dẹp trạng thái
    setIsTestStarted(false);
    setIsTestFinished(false);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    document.addEventListener("webkitfullscreenchange", handleFs); // Lắng nghe sự kiện của Safari
    return () => {
      document.removeEventListener("fullscreenchange", handleFs);
      document.removeEventListener("webkitfullscreenchange", handleFs);
    };
  }, []);

  // KHÓA LỐI THOÁT KHI ĐANG LÀM BÀI TEST
  useEffect(() => {
    if (isTestStarted && !isTestFinished) {
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href); // Chặn back
        setShowExitModal(true);
      };
      
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = ''; // Bắt buộc để trình duyệt hiện cảnh báo chuẩn khi đóng tab
      };

      const handleLinkClick = (e) => {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
          e.preventDefault();
          e.stopPropagation(); // Chặn click menu nội bộ
          setShowExitModal(true);
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleLinkClick, { capture: true });

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('click', handleLinkClick, { capture: true });
      };
    }
  }, [isTestStarted, isTestFinished]);

  useEffect(() => {
    let size = 0;
    if (selectedSetId === 'all') {
      size = contentType === 'kanji' ? kanjiSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0) : allVocabs.length;
    } else {
      if (contentType === 'kanji') {
        const targetSet = kanjiSets.find(s => s.id === parseInt(selectedSetId));
        size = targetSet ? (targetSet.vocab_count || 0) : 0;
      } else {
        const targetSet = sets.find(s => s.id === parseInt(selectedSetId));
        size = targetSet ? (targetSet.vocab_count || 0) : 0;
      }
    }
    setPoolSize(size);
    // Luôn set questionCount bằng tổng số từ vựng (size) mỗi khi đổi học phần
    setQuestionCount(size || 10);
  }, [selectedSetId, allVocabs, sets, kanjiSets, contentType]);

  const getQuestionText = (vocab) => {
    if (!vocab) return "";
    return contentType === 'kanji' ? vocab[kanjiFront] : (isReversed ? vocab.meaning : vocab.word);
  };

  const getAnswerText = (vocab) => {
    if (!vocab) return "";
    return contentType === 'kanji' ? vocab[kanjiBack] : (isReversed ? vocab.word : vocab.meaning);
  };

  const generateTest = async () => {
    vibrate(40);
    let pool = [];
    let allData = [];

    if (selectedSetId === 'all') {
      if (contentType === 'kanji') {
        const fullKanjiSets = await Promise.all(kanjiSets.map(async (s) => {
          if (s.kanjis) return s;
          const res = await api.get(`/kanji-sets/${s.id}`);
          return res.data;
        }));
        setKanjiSets(fullKanjiSets);
        pool = fullKanjiSets.flatMap(s => s.kanjis || []);
        allData = pool;
      } else {
        pool = allVocabs;
        allData = allVocabs;
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
        allData = kanjiSets.flatMap(s => s.kanjis || []); 
      } else {
        let targetSet = sets.find(s => s.id === parseInt(selectedSetId));
        if (targetSet && !targetSet.vocabularies) {
          const res = await api.get(`/sets/${targetSet.id}`);
          targetSet = res.data;
          setSets(prev => prev.map(s => s.id === targetSet.id ? targetSet : s));
        }
        pool = targetSet?.vocabularies || [];
        allData = allVocabs;
      }
    }

    if (pool.length === 0) return toast.warning("Học phần này chưa có dữ liệu nào!");

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedVocabs = shuffled.slice(0, Math.min(questionCount, pool.length));

    const newQuestions = selectedVocabs.map((vocab) => {
      let type = questionFormat;
      if (questionFormat === 'mixed') type = Math.random() > 0.5 ? 'choice' : 'typing';

      const questionText = getQuestionText(vocab);
      const correctAnswer = getAnswerText(vocab);
      
      let options = [];
      if (type === 'choice') {
        const maxSampleSize = Math.min(allData.length, 60);
        const sampleVocabs = [...allData].sort(() => 0.5 - Math.random()).slice(0, maxSampleSize);
        const currentText = contentType === 'kanji' ? vocab[kanjiBack] : vocab.word;

        const scoredAnswers = sampleVocabs.filter(v => v.id !== vocab.id).map(v => {
            let itemScore = 0;
            const vText = contentType === 'kanji' ? v[kanjiBack] : v.word;
            if (currentText && vText) {
              currentText.split('').forEach(c => { if (vText.includes(c)) itemScore += 1; });
            }
            return { ...v, itemScore: itemScore + Math.random() * 1.5 }; 
        });
          
        scoredAnswers.sort((a, b) => b.itemScore - a.itemScore);
        
        let wrongAnswers = [];
        const normalizeStr = (text) => text.toLowerCase().replace(/[.\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
        
        const normalizedCorrect = normalizeStr(correctAnswer);
        const usedNormalizedAnswers = new Set([normalizedCorrect]); 
        
        for (let i = 0; i < scoredAnswers.length; i++) {
          const rawAnsStr = getAnswerText(scoredAnswers[i]);
          const normalizedAns = normalizeStr(rawAnsStr);
          
          if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
            wrongAnswers.push(rawAnsStr);
            usedNormalizedAnswers.add(normalizedAns);
          }
          if (wrongAnswers.length === 3) break;
        }

        if (wrongAnswers.length < 3) {
          const backupVocabs = allData.sort(() => 0.5 - Math.random());
          for (let i = 0; i < backupVocabs.length; i++) {
            const rawAnsStr = getAnswerText(backupVocabs[i]);
            const normalizedAns = normalizeStr(rawAnsStr);
            if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
              wrongAnswers.push(rawAnsStr);
              usedNormalizedAnswers.add(normalizedAns);
            }
            if (wrongAnswers.length === 3) break;
          }
        }
        
        options = [...wrongAnswers, correctAnswer].sort(() => 0.5 - Math.random());
      }

      return { id: vocab.id, type, questionText, correctAnswer, options, userAnswer: '', isCorrect: null };
    });

    setQuestions(newQuestions);
    setIsTestStarted(true);
    setIsTestFinished(false);
    if (!isFullscreen) toggleFullscreen();
  };

  const handleAnswerChange = (index, value) => {
    vibrate(20);
    const updatedQuestions = [...questions];
    updatedQuestions[index].userAnswer = value;
    setQuestions(updatedQuestions);
  };

  const handleAttemptSubmit = () => {
    const answeredCount = questions.filter(q => q.userAnswer.trim() !== '').length;
    if (answeredCount === 0) {
      vibrate([100, 50, 100]);
      return toast.error("Vui lòng trả lời ít nhất 1 câu trước khi nộp bài!");
    }
    setShowSubmitModal(true);
  };

  const confirmSubmitTest = () => {
    setShowSubmitModal(false);
    let correctCount = 0;
    const gradedQuestions = questions.map(q => {
        const clean = (str) => str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim().toLowerCase();
        let isCorrect = false;
        
        if (q.type === 'choice') {
          isCorrect = clean(q.correctAnswer) === clean(q.userAnswer);
        } else {
          isCorrect = clean(q.correctAnswer) === clean(q.userAnswer) || q.correctAnswer.split(',').map(s => clean(s)).includes(clean(q.userAnswer));
        }
        
        if (isCorrect) correctCount++;
        return { ...q, isCorrect };
      });

    setQuestions(gradedQuestions);
    setScore({ correct: correctCount, total: gradedQuestions.length });
    setIsTestFinished(true);
    window.scrollTo(0, 0);

    // LƯU LỊCH SỬ TEST
    const setName = selectedSetId === 'all' ? 'Tất cả từ vựng' : (sets.find(s => s.id === parseInt(selectedSetId))?.title || 'Học phần tùy chỉnh');
    const wrongDetails = gradedQuestions.filter(q => !q.isCorrect).map(q => ({
      question: q.questionText,
      correct_ans: q.correctAnswer,
      user_ans: q.userAnswer,
      vocabId: q.id 
    }));
    
    api.post('/test-history', {
      set_id: selectedSetId === 'all' ? null : parseInt(selectedSetId),
      title: `Test: ${setName}`,
      score: correctCount,
      total: gradedQuestions.length,
      wrong_details: wrongDetails
    }).then(() => fetchHistory(true)).catch(() => toast.error("Lỗi lưu lịch sử!"));
    
    const ratio = correctCount / gradedQuestions.length;
    if (ratio >= 0.8) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      vibrate([100, 50, 100, 50, 200]);
    } else if (ratio >= 0.5) {
      vibrate([50, 50, 50]);
    } else {
      vibrate([200, 100, 200]);
    }
  };

  const scrollToQuestion = (idx) => {
    const element = document.getElementById(`test-question-${idx}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div className="container mt-5 text-center" style={{ maxWidth: '850px' }}>
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
      <h5 className="text-muted fw-bold">Đang tải dữ liệu...</h5>
    </div>
  );

  if (viewHistory) {
    return (
      <div className="container mt-4 fade-in-slide" style={{ maxWidth: '800px' }}>
        {noteModalVocab && <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />}
        <button className="btn btn-outline-secondary fw-bold rounded-pill mb-4 px-4 shadow-sm" onClick={() => setViewHistory(null)}>← Quay lại danh sách</button>
        <div className="alert alert-info shadow-sm border-0 mb-4 rounded-4 p-4">
          <h4 className="fw-bold mb-3 text-primary">{viewHistory.title}</h4>
          <p className="mb-0 text-dark">
            Ngày làm: <strong>{viewHistory.date}</strong> <br/>
            Kết quả: <strong className="text-primary fs-5">{viewHistory.score} / {viewHistory.total}</strong>
          </p>
        </div>
        
        {viewHistory.wrongDetails && viewHistory.wrongDetails.length === 0 ? (
          <div className="alert alert-success fw-bold p-4 rounded-4 shadow-sm border-0">Tuyệt vời! Bạn không làm sai câu nào trong phiên này.</div>
        ) : (
          <div>
            <h5 className="text-danger fw-bold mb-4">Các câu làm sai:</h5>
            {viewHistory.wrongDetails && viewHistory.wrongDetails.map((q, i) => (
              <div key={i} className="bg-white rounded-4 shadow-sm mb-4 p-4" style={{ transform: 'none' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="mb-0 text-dark fw-bold">{q.question}</h5>
                  {q.vocabId && (
                    <button className="btn btn-light rounded-circle shadow-sm border-0 fs-5 d-flex align-items-center justify-content-center transition-all hover-scale ms-3 text-nowrap" style={{ width: '40px', height: '40px', color: '#8a2be2', flexShrink: 0 }} onClick={() => {
                      let vocab = allVocabs.find(v => v.id === q.vocabId);
                      if (vocab) {
                        setNoteModalVocab(vocab);
                      } else {
                        const kSets = kanjiSets.flatMap(s => s.kanjis);
                        vocab = kSets.find(v => v.id === q.vocabId);
                        if (vocab) setNoteModalVocab({ word: vocab.kanji, furigana: vocab.hiragana, meaning: vocab.meaning });
                      }
                    }} title="Lưu vào Note">
                      📓
                    </button>
                  )}
                </div>
                <div className="p-3 rounded-3 bg-light border shadow-sm mb-3">
                  <span className="text-muted fw-bold d-block mb-1 fs-6">Lựa chọn của bạn:</span>
                  <span className="text-danger fw-bold text-decoration-line-through fs-5">{q.user_ans || '(Bỏ trống)'}</span>
                </div>
                <div className="p-3 rounded-3 bg-white border border-success border-2 shadow-sm">
                  <span className="text-success fw-bold d-block mb-1 fs-6">✓ Đáp án đúng:</span>
                  <span className="text-dark fw-bold fs-5">{q.correct_ans}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!isTestStarted) {
    return (
      <>
        <TestSetup 
          sets={sets} kanjiSets={kanjiSets} contentType={contentType} setContentType={setContentType}
          selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId}
          questionCount={questionCount} setQuestionCount={setQuestionCount} poolSize={poolSize}
          questionFormat={questionFormat} setQuestionFormat={setQuestionFormat}
          isReversed={isReversed} setIsReversed={setIsReversed}
          kanjiFront={kanjiFront} setKanjiFront={setKanjiFront}
          kanjiBack={kanjiBack} setKanjiBack={setKanjiBack}
          generateTest={generateTest}
        />
        <div className="container mb-5" style={{ maxWidth: '650px' }}>
          <ExamHistoryTable history={history} setViewHistory={setViewHistory} handleClearHistory={handleClearHistory} onLoadMore={() => fetchHistory(false)} hasMore={hasMoreHistory} />
        </div>
      </>
    );
  }

  const handleCreateMistakeSet = async () => {
    const wrongQs = questions.filter(q => !q.isCorrect);
    if (wrongQs.length === 0) return;
    const title = window.prompt("Nhập tên học phần ôn tập:", "Ôn tập câu sai - Bài Test");
    if (!title || !title.trim()) return;
    const rawText = wrongQs.map(q => `${q.questionText} | ${q.correctAnswer}`).join('\n');
    try {
      await api.post("/vocabularies/bulk-import", { title: title.trim(), raw_text: rawText });
      toast.success(`Đã tạo học phần: ${title}`);
    } catch (error) { toast.error("Lỗi khi tạo học phần ôn tập"); }
  };

  if (isTestFinished) {
    return (
      <div className={`container-fluid py-4 transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
        {noteModalVocab && <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />}
        <div className="d-flex justify-content-between align-items-center mx-auto mb-4 d-print-none" style={{ maxWidth: '800px' }}>
          <button className="btn btn-outline-secondary fw-bold rounded-pill shadow-sm px-4 hover-bg-light transition-all" onClick={() => { setIsTestStarted(false); setIsTestFinished(false); window.scrollTo(0,0); }}>
            ← Đóng kết quả
          </button>
          <button className="btn btn-light rounded-circle shadow-sm border-0 hover-bg-light transition-all" onClick={toggleFullscreen} title="Toàn màn hình (F)">
            {isFullscreen ? '↙️' : '⛶'}
          </button>
        </div>
        <TestResult score={score} questions={questions} onRestart={() => { setIsTestStarted(false); setIsTestFinished(false); window.scrollTo(0,0); }} onCreateMistakeSet={handleCreateMistakeSet} onSaveNote={(vocabId) => {
          const allData = contentType === 'kanji' ? kanjiSets.flatMap(s => s.kanjis) : allVocabs;
          const vocab = allData.find(v => v.id === vocabId);
          if (vocab) {
            if (contentType === 'kanji') {
              setNoteModalVocab({ word: vocab.kanji, furigana: vocab.hiragana, meaning: vocab.meaning });
            } else {
              setNoteModalVocab(vocab);
            }
          }
        }} />
      </div>
    );
  }

  const answeredCount = questions.filter(q => q.userAnswer.trim() !== '').length;

  return (
    <div className={`container-fluid py-4 transition-all ${isFullscreen ? 'bg-light overflow-auto mobile-fullscreen' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh' } : {}}>
      
      {/* MODAL XÁC NHẬN THOÁT */}
      {showExitModal && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 text-center" style={{ width: '90%', maxWidth: '400px' }}>
            <h4 className="fw-bold text-danger mb-3">Cảnh báo</h4>
            <p className="text-dark mb-4 fs-5">Bạn đang làm bài kiểm tra. Nếu thoát, kết quả hiện tại sẽ bị hủy và không được lưu lại. Bạn có chắc chắn muốn thoát?</p>
            <div className="d-flex gap-3">
              <button className="btn btn-danger fw-bold w-50 py-2 rounded-3" onClick={confirmExit}>Hủy bài thi</button>
              <button className="btn btn-secondary fw-bold w-50 py-2 rounded-3" onClick={() => setShowExitModal(false)}>Tiếp tục làm bài</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN NỘP BÀI */}
      {showSubmitModal && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 text-center" style={{ width: '90%', maxWidth: '400px' }}>
            <h4 className="fw-bold text-primary mb-3">Nộp bài</h4>
            <p className="text-dark mb-4 fs-5">Bạn đã hoàn thành <strong className="text-success">{answeredCount}/{questions.length}</strong> câu. Bạn có chắc chắn muốn kết thúc bài thi?</p>
            <div className="d-flex gap-3">
              <button className="btn btn-secondary fw-bold w-50 py-2 rounded-3" onClick={() => setShowSubmitModal(false)}>Hủy</button>
              <button className="btn btn-primary fw-bold w-50 py-2 rounded-3" onClick={confirmSubmitTest}>Kết thúc bài thi</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto" style={{ maxWidth: '1100px' }}>
        
        {/* THANH TOP ĐIỀU HƯỚNG */}
        <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
          <button className="btn btn-outline-secondary fw-bold rounded-pill shadow-sm px-4 hover-bg-light transition-all" onClick={handleExit}>
            ← Hủy bài thi
          </button>
          <button className="btn btn-light rounded-circle shadow-sm border-0 hover-bg-light transition-all" onClick={toggleFullscreen} title="Toàn màn hình (F)">
            {isFullscreen ? '↙️' : '⛶'}
          </button>
        </div>

        <div className="row">
          {/* NỘI DUNG BÀI THI */}
          <div className="col-lg-8 mb-4">
            {questions.map((q, idx) => (
              <div id={`test-question-${idx}`} key={idx} className="card shadow-sm border-0 mb-4 rounded-4 fade-in-slide">
                <div className="card-body p-4 p-md-5">
                  <h4 className="mb-4 fw-bold d-flex align-items-center" style={{ lineHeight: '1.5' }}>
                    <span className="badge bg-primary me-3 shadow-sm fs-5 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      {idx + 1}
                    </span> 
                    {q.questionText}
                  </h4>

                  {q.type === 'choice' ? (
                    <div className="row g-3 mt-4">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = q.userAnswer === opt;
                        return (
                          <div className="col-sm-6" key={oIdx}>
                            <button 
                              className={`btn w-100 text-center p-3 fs-5 fw-bold transition-all shadow-sm d-flex align-items-center justify-content-center ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-dark border hover-bg-light'}`}
                              style={{ borderRadius: '16px', minHeight: '80px', borderWidth: '2px' }}
                              onClick={() => handleAnswerChange(idx, opt)}
                            >
                              {opt}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <input 
                        type="text" 
                        className="form-control form-control-lg py-4 px-4 bg-light fw-bold d-print-none shadow-sm rounded-4 text-center" 
                        placeholder="Gõ đáp án chính xác vào đây..."
                        value={q.userAnswer}
                        onChange={(e) => handleAnswerChange(idx, e.target.value)}
                        autoComplete="off"
                        style={{ border: '2px solid #dee2e6', fontSize: '1.5rem' }}
                      />
                      <div className="print-blank-line d-none d-print-block"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button className="btn btn-success btn-lg px-5 py-4 fw-bold w-100 shadow-lg d-print-none mt-2 hover-scale transition-all" style={{ borderRadius: '16px', fontSize: '1.3rem' }} onClick={handleAttemptSubmit}>
              Nộp bài ngay
            </button>
          </div>

          {/* BẢNG ĐIỀU HƯỚNG BÊN PHẢI */}
          <div className="col-lg-4 d-print-none">
            <div className="card shadow-sm border-0 sticky-top" style={{ top: '20px', zIndex: 1000, borderRadius: '24px' }}>
              <div className="card-body p-4">
                <h5 className="mb-3 text-center fw-bold text-dark">Bảng điều hướng</h5>
                <p className="text-center text-muted small mb-3">Đã hoàn thành: <strong>{answeredCount} / {questions.length}</strong></p>
                <div className="progress mb-4 shadow-sm" style={{ height: '8px', borderRadius: '10px' }}>
                  <div className="progress-bar bg-success" role="progressbar" style={{ width: `${(answeredCount / questions.length) * 100}%` }}></div>
                </div>
                
                <div className="d-flex flex-wrap gap-2 justify-content-center" style={{ maxHeight: '55dvh', overflowY: 'auto', paddingRight: '5px', paddingBottom: '20px' }}>
                  {questions.map((q, idx) => {
                    const isAnswered = q.userAnswer.trim() !== '';
                    return (
                      <button 
                        key={idx} 
                        className={`btn ${isAnswered ? 'btn-primary text-white shadow-sm border-primary' : 'bg-white text-dark border'} fw-bold transition-all hover-scale`} 
                        style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }} 
                        onClick={() => scrollToQuestion(idx)}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default TestMode;