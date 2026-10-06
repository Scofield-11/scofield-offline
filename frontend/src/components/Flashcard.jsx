import { useState, useEffect } from "react";
import { playSound } from '../utils/audio'; // Import bộ máy âm thanh
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Volume2, BookOpen, Edit3 } from 'lucide-react'; // Thêm icons đẹp từ lucide-react

function Flashcard({ vocab, autoPlay, contentType = 'vocab', isReversed = false, kanjiFront = 'kanji', kanjiBack = 'meaning', onEdit, onSaveNote }) {
  const [flipped, setFlipped] = useState(false);
  const [isStarred, setIsStarred] = useState(false); // Thêm trạng thái Star

  const handleOpenNote = (e) => {
    e.stopPropagation();
    if (onSaveNote && vocab) onSaveNote(vocab);
  };

  const handleToggleStar = (e) => {
    e.stopPropagation();
    setIsStarred(!isStarred);
    playSound('pop'); // Có thể đổi thành âm thanh 'star' nếu có
    // TODO: Gửi API lưu trạng thái star cho từ vựng này
  };

  // Bảo vệ trường hợp vocab bị rỗng khi component render sớm
  if (!vocab) return null;

  const detectLanguage = (text, field) => {
    if (field === 'kanji' || field === 'hiragana') return 'ja-JP';
    if (field === 'word') return vocab.language === 'en' ? 'en-US' : 'ja-JP';
    if (field === 'hanviet' || field === 'meaning' || field === 'summary') return 'vi-VN';
    if (!text) return 'en-US';
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    return hasJapanese ? 'ja-JP' : 'en-US';
  };

  const frontField = contentType === 'kanji' ? kanjiFront : (kanjiFront || (isReversed ? 'meaning' : 'word'));
  const backField = contentType === 'kanji' ? kanjiBack : (kanjiBack || (isReversed ? 'word' : 'meaning'));

  const getFallbackText = (field, isFront) => {
    if (field === 'summary') return vocab.meaning; // Mặc định đọc ý nghĩa cho mặt summary
    let text = vocab[field] || '';
    if (!text && (field === 'hanviet' || field === 'hiragana')) {
      text = isFront ? vocab.word : vocab.meaning;
    }
    return text;
  };

  const frontText = getFallbackText(frontField, true);
  const backText = getFallbackText(backField, false);
  
  const frontLang = detectLanguage(frontText, frontField);
  const backLang = detectLanguage(backText, backField);

  const renderField = (field, isFront) => {
    // --- XỬ LÝ MẶT SAU (TỔNG HỢP) TRÊN NỀN TÍM ---
    if (field === 'summary') {
      return (
        <div className="d-flex flex-column gap-3 text-center w-100 align-items-center justify-content-center h-100">
          {/* Hán Việt: Dùng màu vàng sáng để nổi trên nền tím */}
          {vocab.hanviet && (
            <div className="fw-bold text-uppercase" style={{ color: '#ffd700', fontSize: '1.2rem', letterSpacing: '4px' }}>
              [{vocab.hanviet}]
            </div>
          )}
          
          {/* Phiên âm: Dùng màu cyan/bạc hà nhạt cho dễ đọc */}
          {vocab.hiragana && (
            <div className="fw-bold" style={{ color: '#00f2fe', fontSize: '1.8rem' }}>
              {vocab.hiragana}
            </div>
          )}
          
          {/* Vạch ngăn cách mỏng màu trắng */}
          {(vocab.hanviet || vocab.hiragana) && (
            <div className="my-2 bg-white rounded-pill" style={{ width: '40px', height: '4px', opacity: 0.5 }} />
          )}
          
          {/* Ý nghĩa: Màu trắng tinh, font chữ to rõ ràng */}
          <div className="text-white fw-bold" style={{ fontSize: '2rem', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {vocab.meaning}
          </div>
        </div>
      );
    }

    let displayField = field;
    if (!vocab[field] && (field === 'hanviet' || field === 'hiragana')) {
        displayField = isFront ? 'word' : 'meaning';
    }

    // --- XỬ LÝ MẶT TRƯỚC (CHỈ HIỆN KANJI/TỪ VỰNG GỐC) ---
    if (displayField === 'kanji' || displayField === 'word') {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
          <div style={{ fontSize: '4.5rem', fontFamily: '"Yu Mincho", "MS Mincho", serif', lineHeight: '1.2', color: isFront ? '#1f2937' : '#fff' }}>
            {vocab[displayField]}
          </div>
        </div>
      );
    }
    
    // Fallback cho các trường hợp thẻ đảo ngược
    if (displayField === 'hanviet') {
      return <div className="fw-bold h-100 d-flex align-items-center justify-content-center" style={{ color: isFront ? '#863bff' : '#ffd700', fontSize: '2rem', letterSpacing: '2px' }}>{vocab[displayField]}</div>;
    }
    if (displayField === 'hiragana') {
      return <div className="fw-bold h-100 d-flex align-items-center justify-content-center" style={{ color: isFront ? '#4b5563' : '#00f2fe', fontSize: '2rem' }}>{vocab[displayField]}</div>;
    }
    return <div className="fw-bold h-100 d-flex align-items-center justify-content-center" style={{ color: isFront ? '#111827' : '#fff', fontSize: '2.2rem' }}>{vocab[displayField]}</div>;
  };

  const speak = (text, lang) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    setFlipped(false);
    if (autoPlay) setTimeout(() => speak(frontText, frontLang), 250);
  }, [vocab, autoPlay, contentType, isReversed]);

  const handleFlip = () => {
    playSound('pop');
    const newState = !flipped;
    setFlipped(newState);
    if (autoPlay) speak(newState ? backText : frontText, newState ? backLang : frontLang);
  };

  const playAudio = (e, text, lang) => {
    e.stopPropagation(); 
    speak(text, lang);
  };

  // Nút Star
  const renderStarButton = () => (
    <button 
      className="btn btn-light position-absolute top-0 start-0 m-3 rounded-circle border-0 d-flex align-items-center justify-content-center tap-effect"
      style={{ 
        width: '44px', height: '44px', zIndex: 20, 
        backgroundColor: isStarred ? '#fffbeb' : '#f3f4f6',
        color: isStarred ? '#f59e0b' : '#9ca3af',
        boxShadow: isStarred ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
      }}
      onClick={handleToggleStar}
      title="Đánh dấu sao (Quan trọng)"
    >
      <Star size={22} fill={isStarred ? "currentColor" : "none"} strokeWidth={isStarred ? 1.5 : 2.5} />
    </button>
  );

  return (
    <div className="flashcard-container tap-effect" onClick={handleFlip} style={{ perspective: '1200px' }}>
      <motion.div
        className="w-100 h-100 position-relative"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, mass: 1 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* === MẶT TRƯỚC === */}
        <div 
          className="position-absolute w-100 h-100 d-flex flex-column rounded-4 bg-white"
          style={{ 
            backfaceVisibility: 'hidden',
            border: '2px solid #f3f4f6',
            boxShadow: '0 12px 24px -6px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04), inset 0 -4px 0 rgba(0,0,0,0.02)', // Drop shadow sâu ở dưới
            overflow: 'hidden'
          }}
        >
          {renderStarButton()}
          
          <div className="flex-grow-1 p-4 d-flex align-items-center justify-content-center text-center">
            {renderField(frontField, true)}
          </div>
          
          <div className="p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
            <button 
              className="btn btn-sm btn-white rounded-pill text-muted fw-bold d-flex align-items-center gap-2 tap-effect"
              onClick={handleOpenNote}
            >
              <BookOpen size={16} /> <span>Sổ tay</span>
            </button>
            <button 
              className="btn btn-sm btn-primary rounded-pill fw-bold d-flex align-items-center gap-2 tap-effect shadow-sm"
              onClick={(e) => playAudio(e, frontText, frontLang)}
            >
              <Volume2 size={16} /> <span>Nghe</span>
            </button>
          </div>
        </div>

        {/* === MẶT SAU === */}
        <div 
          className="position-absolute w-100 h-100 d-flex flex-column rounded-4"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: '#863bff',
            border: '2px solid #7c3aed',
            boxShadow: '0 12px 24px -6px rgba(134,59,255,0.25), 0 4px 8px -4px rgba(134,59,255,0.15), inset 0 -4px 0 rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}
        >
          {renderStarButton()}

          <button 
            className="btn btn-light position-absolute top-0 end-0 m-3 rounded-circle border-0 d-flex align-items-center justify-content-center tap-effect shadow-sm"
            style={{ width: '44px', height: '44px', zIndex: 20, color: '#863bff' }}
            onClick={(e) => { e.stopPropagation(); if(onEdit) onEdit(vocab); }}
            title="Sửa nhanh từ này"
          >
            <Edit3 size={20} />
          </button>
          
          <div className="flex-grow-1 p-4 d-flex align-items-center justify-content-center text-center">
            {renderField(backField, false)}
          </div>
          
          <div className="p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <button 
              className="btn btn-sm text-white fw-bold d-flex align-items-center gap-2 tap-effect rounded-pill"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              onClick={handleOpenNote}
            >
              <BookOpen size={16} /> <span>Sổ tay</span>
            </button>
            <button 
              className="btn btn-sm bg-white text-primary rounded-pill fw-bold d-flex align-items-center gap-2 tap-effect shadow-sm"
              onClick={(e) => playAudio(e, backText, backLang)}
            >
              <Volume2 size={16} /> <span>Nghe</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Flashcard;