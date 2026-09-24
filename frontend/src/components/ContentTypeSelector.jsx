import React from 'react';

function ContentTypeSelector({ contentType, setContentType }) {
  return (
    <div className="d-flex gap-2 mb-4">
      <button
        className={`btn w-50 fw-bold shadow-sm ${contentType === 'vocab' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white text-dark border-0'}`}
        onClick={() => setContentType('vocab')}
        style={{ borderRadius: '12px', padding: '14px' }}
      >
        📖 Từ vựng
      </button>
      <button
        className={`btn w-50 fw-bold shadow-sm ${contentType === 'kanji' ? 'btn-primary text-white' : 'btn-outline-secondary bg-white text-dark border-0'}`}
        onClick={() => setContentType('kanji')}
        style={{ borderRadius: '12px', padding: '14px' }}
      >
        ⛩️ Kanji
      </button>
    </div>
  );
}

export default ContentTypeSelector;