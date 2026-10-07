import React, { useState } from 'react';
import './GameModeSelector.css';

/**
 * GameModeSelector - Bento Grid component dùng chung cho tất cả chế độ học.
 * 
 * Props:
 * - hasFourFields: boolean - Có phải tiếng Nhật (4 trường: kanji/word, hanviet, hiragana, meaning)?
 * - currentContentType: 'vocab' | 'kanji'
 * - isReversed / setIsReversed: Dùng cho trường hợp chỉ có 2 trường (EN)
 * - kanjiFront / setKanjiFront: Trường hiển thị mặt trước (cho JP/Kanji)
 * - kanjiBack / setKanjiBack: Trường hiển thị mặt sau (cho JP/Kanji)
 * - onSwap: Hàm xử lý đảo chiều
 * - presets: (optional) Mảng tuỳ chỉnh danh sách gói rèn luyện
 *   Mỗi phần tử: { id, icon, label, description, frontKey, backKey }
 * - twoFieldPresets: (optional) Tương tự nhưng cho trường hợp 2 trường
 */

// ── Cấu hình mặc định cho 4-field (JP/Kanji) ──
const DEFAULT_FOUR_FIELD_PRESETS = [
  {
    id: 'translate', icon: '🧠', iconBg: '#ede9fe', label: 'Luyện Dịch',
    getDesc: (f, b, type) => { const w = type === 'kanji' ? 'Hán tự' : 'Từ vựng'; return f === 'meaning' && (b === 'word' || b === 'kanji') ? `Ý nghĩa ➔ ${w}` : `${w} ➔ Ý nghĩa`; },
    frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'meaning',
    isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'meaning') || (f === 'meaning' && b === w); }
  },
  {
    id: 'reading', icon: '🗣️', iconBg: '#fef3c7', label: 'Luyện Đọc',
    getDesc: (f, b, type) => { const w = type === 'kanji' ? 'Hán tự' : 'Từ vựng'; return f === 'hiragana' && (b === 'word' || b === 'kanji') ? `Phiên âm ➔ ${w}` : `${w} ➔ Phiên âm`; },
    frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'hiragana',
    isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'hiragana') || (f === 'hiragana' && b === w); }
  },
  {
    id: 'hanviet', icon: '👑', iconBg: '#fee2e2', label: 'Vua Hán Tự',
    getDesc: (f, b) => f === 'meaning' && b === 'hanviet' ? 'Ý nghĩa ➔ Hán Việt' : 'Hán Việt ➔ Ý nghĩa',
    frontKey: () => 'hanviet', backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet')
  },
  {
    id: 'listening', icon: '🎧', iconBg: '#dbeafe', label: 'Nghe Hiểu',
    getDesc: (f, b) => f === 'meaning' && b === 'hiragana' ? 'Ý nghĩa ➔ Phiên âm' : 'Phiên âm ➔ Ý nghĩa',
    frontKey: () => 'hiragana', backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana')
  }
];

// ── Cấu hình mặc định cho 2-field (EN hoặc không có hanviet/hiragana) ──
const DEFAULT_TWO_FIELD_PRESETS = [
  {
    id: 'forward',
    icon: '🇺🇸',
    iconBg: '#dbeafe',
    label: 'Dịch thuật',
    description: 'Nhìn Từ vựng ➔ Ý nghĩa',
    reversedValue: false,
  },
  {
    id: 'backward',
    icon: '🇻🇳',
    iconBg: '#fef3c7',
    label: 'Hồi tưởng',
    description: 'Nhìn Ý nghĩa ➔ Từ vựng',
    reversedValue: true,
  }
];

function GameModeSelector({
  hasFourFields,
  currentContentType = 'vocab',
  isReversed = false,
  setIsReversed,
  kanjiFront,
  setKanjiFront,
  kanjiBack,
  setKanjiBack,
  onSwap,
  presets,
  twoFieldPresets,
  sectionLabel = 'Chọn kỹ năng rèn luyện',
}) {
  const [swapRotation, setSwapRotation] = useState(0);

  const fourFieldPresets = presets || DEFAULT_FOUR_FIELD_PRESETS;
  const twoPresets = twoFieldPresets || DEFAULT_TWO_FIELD_PRESETS;

  const handleSwapClick = () => {
    setSwapRotation(prev => prev + 180);
    if (onSwap) onSwap();
  };

  const handleFourFieldSelect = (preset) => {
    const isWord = preset.frontKey(currentContentType);
    const targetBack = preset.backKey(currentContentType);

    if (preset.isActive(kanjiFront, kanjiBack, currentContentType)) {
      // Nếu đang active -> đảo chiều
      if (onSwap) onSwap();
    } else {
      setKanjiFront(isWord);
      setKanjiBack(targetBack);
    }
  };

  const handleTwoFieldSelect = (preset) => {
    if (isReversed === preset.reversedValue) {
      // Đang active -> đảo chiều
      if (onSwap) onSwap();
    } else {
      setIsReversed(preset.reversedValue);
    }
  };

  // ── Swap direction label ──
  const getDirectionLabel = () => {
    if (hasFourFields) {
      const map = { kanji: 'Hán tự', word: 'Từ vựng', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return `${map[kanjiFront] || 'A'} → ${map[kanjiBack] || 'B'}`;
    }
    return isReversed ? 'Nghĩa → Từ' : 'Từ → Nghĩa';
  };

  return (
    <div className="gms-container">
      {/* ── Header: Label + Swap Button ── */}
      <div className="gms-header">
        <span className="gms-section-label">{sectionLabel}</span>
        <button
          className="gms-swap-btn"
          onClick={handleSwapClick}
          title={`Đảo chiều: ${getDirectionLabel()}`}
        >
          <span
            className="gms-swap-icon"
            style={{ transform: `rotate(${swapRotation}deg)` }}
          >
            🔄
          </span>
          <span className="gms-swap-label">{getDirectionLabel()}</span>
        </button>
      </div>

      {/* ── Bento Grid Cards ── */}
      {hasFourFields ? (
        <div className="gms-grid gms-grid-4">
          {fourFieldPresets.map((preset) => {
            const active = preset.isActive(kanjiFront, kanjiBack, currentContentType);
            const desc = preset.getDesc(kanjiFront, kanjiBack, currentContentType);
            return (
              <button
                key={preset.id}
                className={`gms-card ${active ? 'gms-card--active' : ''}`}
                onClick={() => handleFourFieldSelect(preset)}
              >
                <div className="gms-card-icon" style={{ backgroundColor: active ? '#ede9fe' : (preset.iconBg || '#f3f4f6') }}>
                  <span className="gms-card-emoji">{preset.icon}</span>
                </div>
                <div className="gms-card-content">
                  <span className="gms-card-title">{preset.label}</span>
                  <span className="gms-card-desc">{desc}</span>
                </div>
                {active && <div className="gms-card-check">✓</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="gms-grid gms-grid-2">
          {twoPresets.map((preset) => {
            const active = isReversed === preset.reversedValue;
            return (
              <button
                key={preset.id}
                className={`gms-card ${active ? 'gms-card--active' : ''}`}
                onClick={() => handleTwoFieldSelect(preset)}
              >
                <div className="gms-card-icon" style={{ backgroundColor: active ? '#ede9fe' : (preset.iconBg || '#f3f4f6') }}>
                  <span className="gms-card-emoji">{preset.icon}</span>
                </div>
                <div className="gms-card-content">
                  <span className="gms-card-title">{preset.label}</span>
                  <span className="gms-card-desc">{preset.description}</span>
                </div>
                {active && <div className="gms-card-check">✓</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GameModeSelector;

