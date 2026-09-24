import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import confetti from 'canvas-confetti';

function ExamTaking({ examData, isInstantFeedback, backToList, fetchHistory, openSaveModal, startExam }) {
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (qId, optIndex) => {
    if (isSubmitted) return;
    setAnswers({ ...answers, [qId]: optIndex });
  };

  const scrollToQuestion = (idx) => {
    const element = document.getElementById(`question-${idx}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    const wrongQs = examData.questions.filter(q => answers[q.id] !== q.correct_ans);
    const scoreCount = examData.questions.length - wrongQs.length;
    
    if (scoreCount / examData.questions.length >= 0.8) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
    
    const wrongDetails = wrongQs.map(q => ({
      question: q.question,
      options: [...q.options],
      correct_ans: q.correct_ans,
      user_ans: answers[q.id]
    }));

    // LƯU LỊCH SỬ VÀO LOCALSTORAGE ĐỂ TÁCH BIỆT THEO TÊN MIỀN
    const newRecord = {
      id: Date.now(),
      examId: examData.id,
      title: examData.title,
      score: scoreCount,
      total: examData.questions.length,
      date: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      wrongDetails: wrongDetails
    };

    const currentHistory = JSON.parse(localStorage.getItem('scofieldExamHistory') || '[]');
    localStorage.setItem('scofieldExamHistory', JSON.stringify([newRecord, ...currentHistory]));
    
    fetchHistory(); 
  };

  const handleCreateFromCurrentMistakes = async () => {
    const wrongQs = examData.questions.filter(q => answers[q.id] !== q.correct_ans);
    const newTitle = window.prompt("Vui lòng nhập tên cho đề ôn tập:", `Ôn tập câu sai - ${examData.title}`);
    if (!newTitle || !newTitle.trim()) return;

    const rawText = wrongQs.map(q => 
      `${q.question} | ${q.options[0]} | ${q.options[1]} | ${q.options[2]} | ${q.options[3]} | ${q.correct_ans}`
    ).join('\n');

    try {
      await api.post("/exams/import", { title: newTitle.trim(), raw_text: rawText });
      toast.success(`Đã tạo thành công đề thi: ${newTitle.trim()}`);
      backToList(); 
      window.scrollTo(0, 0);
    } catch (error) {
      toast.error("Lỗi khi tạo bài test ôn tập.");
    }
  };

  const wrongQuestions = examData.questions.filter(q => answers[q.id] !== q.correct_ans);
  const score = examData.questions.length - wrongQuestions.length;
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="container mt-4" style={{ maxWidth: '1100px' }}>
      <button className="btn btn-secondary mb-4 d-print-none" onClick={backToList}>← Quay lại danh sách</button>
      
      <div className="row">
        <div className="col-lg-8 mb-4">
          <h3 className="mb-4">{examData.title}</h3>

          {examData.questions.map((q, idx) => {
            const userAns = answers[q.id];
            const isAnswered = userAns !== undefined;
            const showResult = isSubmitted || (isInstantFeedback && isAnswered);

            return (
              <div id={`question-${idx}`} key={q.id} className="bg-white rounded shadow-sm mb-4 p-4 fade-in-slide" style={{ transform: 'none' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="mb-0">Câu {idx + 1}: {q.question}</h5>
                  <button className="btn btn-sm btn-outline-warning fw-bold text-dark ms-3 text-nowrap d-print-none" onClick={() => openSaveModal(q)} title="Lưu câu hỏi này">⭐ Lưu</button>
                </div>
                <div className="row">
                  {q.options.map((opt, oIdx) => {
                    const optNumber = oIdx + 1;
                    let btnClass = "btn-outline-secondary";
                    if (showResult) {
                      if (optNumber === q.correct_ans) btnClass = "btn-success text-white border-success"; 
                      else if (userAns === optNumber && userAns !== q.correct_ans) btnClass = "btn-danger text-white border-danger";
                    } else if (userAns === optNumber) btnClass = "btn-primary"; 

                    return (
                      <div className="col-sm-6 mb-3" key={oIdx}>
                        <button className={`btn w-100 text-start py-2 ${btnClass}`} onClick={() => handleSelect(q.id, optNumber)}>{opt}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!isSubmitted ? (
            <button className="btn btn-primary btn-lg w-100 mb-5 shadow-sm d-print-none" onClick={handleSubmit}>Nộp bài</button>
          ) : (
            <div className="alert alert-info mt-4 mb-5 shadow-sm border-0">
              <h4 className="fw-bold">Kết quả: {score} / {totalQuestions}</h4>
              {wrongQuestions.length > 0 && (
                <div className="mt-4">
                  <strong className="text-danger fs-5">Các câu làm sai:</strong>
                  <div className="mt-3">
                    {wrongQuestions.map((q) => {
                      const userAns = answers[q.id];
                      return (
                        <div key={q.id} className="bg-white rounded shadow-sm mb-4 p-4" style={{ transform: 'none' }}>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h5 className="mb-0 text-dark">{q.question}</h5>
                            <button className="btn btn-sm btn-outline-warning fw-bold text-dark ms-3 text-nowrap d-print-none" onClick={() => openSaveModal(q)} title="Lưu câu hỏi này">⭐ Lưu</button>
                          </div>
                          <div className="row">
                            {q.options.map((opt, oIdx) => {
                              const optNumber = oIdx + 1;
                              let btnClass = "btn-outline-secondary";
                              if (optNumber === q.correct_ans) btnClass = "btn-success text-white border-success"; 
                              else if (userAns === optNumber && userAns !== q.correct_ans) btnClass = "btn-danger text-white border-danger";
                              return (
                                <div className="col-sm-6 mb-3" key={oIdx}>
                                  <button className={`btn w-100 text-start py-2 ${btnClass}`} style={{ cursor: 'default' }}>{opt}</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="d-flex flex-wrap gap-3 mt-4 d-print-none">
                    <button className="btn btn-warning fw-bold px-4" onClick={() => startExam(examData.id)}>Làm lại bài này</button>
                    <button className="btn btn-primary fw-bold px-4" onClick={handleCreateFromCurrentMistakes}>Tạo đề mới từ câu sai</button>
                    <button className="btn btn-secondary fw-bold px-4" onClick={() => window.print()}>🖨️ In kết quả (PDF)</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="col-lg-4 d-print-none">
          <div className="card shadow-sm border-0 sticky-top" style={{ top: '20px', zIndex: 1000 }}>
            <div className="card-body">
              <h5 className="mb-4 text-center">Bảng điều hướng</h5>
              
              {!isSubmitted && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between text-muted fw-bold mb-2" style={{ fontSize: '0.9rem' }}>
                    <span>Đã làm: {answeredCount} / {totalQuestions} câu</span>
                    <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
                  </div>
                  <div className="progress shadow-sm" style={{ height: '8px' }}>
                    <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}></div>
                  </div>
                </div>
              )}

              <div className="d-flex flex-wrap gap-2 justify-content-center" style={{ maxHeight: '55dvh', overflowY: 'auto', paddingRight: '5px', paddingBottom: '20px' }}>
                {examData.questions.map((q, idx) => {
                  const userAns = answers[q.id];
                  const isAnswered = userAns !== undefined;
                  let btnColorClass = "btn-outline-secondary";
                  if (isSubmitted) {
                    if (userAns === q.correct_ans) btnColorClass = "btn-success text-white";
                    else if (isAnswered) btnColorClass = "btn-danger text-white";
                  } else if (isAnswered) btnColorClass = "btn-primary";
                  return (
                    <button key={idx} className={`btn ${btnColorClass} fw-bold`} style={{ width: '48px', height: '48px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => scrollToQuestion(idx)}>
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
  );
}

export default ExamTaking;