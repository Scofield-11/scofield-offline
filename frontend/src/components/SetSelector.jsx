import React, { useState, useEffect, useRef } from 'react';

function SetSelector({ sets, selectedSetId, setSelectedSetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [filterType, setFilterType] = useState('ja'); // 'ja', 'en', 'kanji'
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_ja' || idStr === 'all_ja') setFilterType('ja');
    else if (idStr === 'lang_en' || idStr === 'all_en') setFilterType('en');
    else if (idStr === 'lang_kanji' || idStr === 'all_kanji') setFilterType('kanji');
    else if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      const s = sets.find(x => (x.folder_path || '🏠 Thư mục gốc') === folderName);
      if (s) {
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else setFilterType('ja');
      }
    } else {
      const s = sets.find(set => set.id == selectedSetId);
      if (s) {
        if (s.type === 'kanji') setFilterType('kanji');
        else if (s.language === 'en') setFilterType('en');
        else setFilterType('ja');
      }
    }
  }, [selectedSetId, sets]);

  const validSets = sets.filter(s => !s.title.startsWith('_Thư mục:'));
  
  const typeFilteredSets = validSets.filter(s => {
    if (filterType === 'kanji') return s.type === 'kanji';
    if (filterType === 'en') return s.type !== 'kanji' && s.language === 'en';
    return s.type !== 'kanji' && (s.language === 'ja' || !s.language);
  });

  const filteredSets = typeFilteredSets.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSets = filteredSets.reduce((acc, set) => {
    const folder = set.folder_path || '🏠 Thư mục gốc';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(set);
    return acc;
  }, {});

  const isSearching = searchTerm.trim().length > 0;

  const toggleFolder = (folder, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSelect = (id) => {
    setSelectedSetId(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  let selectedDisplay = "-- Chọn học phần --";
  const idStr = String(selectedSetId);
  if (idStr === 'lang_kanji' || idStr === 'all_kanji') {
    selectedDisplay = '⛩️ Tất cả Kanji';
  } else if (idStr === 'lang_ja' || idStr === 'all_ja') {
    selectedDisplay = "🇯🇵 Tất cả từ vựng Tiếng Nhật";
  } else if (idStr === 'lang_en' || idStr === 'all_en') {
    selectedDisplay = "🇬🇧 Tất cả từ vựng Tiếng Anh";
  } else if (idStr.startsWith('folder_')) {
    const fName = idStr.substring(7);
    const prefix = filterType === 'kanji' ? '⛩️' : (filterType === 'en' ? '🇬🇧' : '🇯🇵');
    selectedDisplay = `${prefix} Thư mục: ${fName}`;
  } else {
    const selected = validSets.find(s => s.id == selectedSetId);
    if (selected) {
        const prefix = selected.type === 'kanji' ? '⛩️' : (selected.language === 'en' ? '🇬🇧' : '🇯🇵');
        selectedDisplay = `${prefix} ${selected.title}`;
    }
  }

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      <button
        type="button"
        className="btn w-100 d-flex justify-content-between align-items-center bg-white border shadow-sm"
        style={{ borderRadius: '16px', height: '60px', padding: '0 20px', fontSize: '1.1rem', fontWeight: '600', transition: 'all 0.2s', borderColor: isOpen ? '#8a2be2' : '#dee2e6' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-truncate text-dark">{selectedDisplay}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
      </button>

      {isOpen && (
        <div 
          className="position-absolute w-100 bg-white shadow-lg mt-2 overflow-hidden" 
          style={{ zIndex: 1050, top: '100%', left: 0, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)', animation: 'fadeInDown 0.2s ease-out' }}
        >
          {/* SEARCH BOX */}
          <div className="p-3 border-bottom bg-light">
            <div className="position-relative">
              <span className="position-absolute" style={{ top: '50%', left: '15px', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                className="form-control fw-bold border-0 shadow-sm"
                placeholder="Tìm tên học phần..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '20px', paddingLeft: '40px', height: '45px', backgroundColor: '#fff' }}
                autoFocus
              />
            </div>
          </div>
          
          {/* TABS CẤP 1 (NGÔN NGỮ) */}
          <div className="d-flex p-2 gap-2 bg-light border-bottom justify-content-center">
            <button className={`btn flex-fill fw-bold py-2 px-1 rounded-pill transition-all ${filterType === 'ja' ? 'btn-primary shadow-sm text-white' : 'bg-white text-muted border-0 hover-bg-light'}`} style={{ fontSize: '0.9rem' }} onClick={() => setFilterType('ja')}>🇯🇵 Tiếng Nhật</button>
            <button className={`btn flex-fill fw-bold py-2 px-1 rounded-pill transition-all ${filterType === 'en' ? 'btn-primary shadow-sm text-white' : 'bg-white text-muted border-0 hover-bg-light'}`} style={{ fontSize: '0.9rem' }} onClick={() => setFilterType('en')}>🇬🇧 Tiếng Anh</button>
            <button className={`btn flex-fill fw-bold py-2 px-1 rounded-pill transition-all ${filterType === 'kanji' ? 'btn-primary shadow-sm text-white' : 'bg-white text-muted border-0 hover-bg-light'}`} style={{ fontSize: '0.9rem' }} onClick={() => setFilterType('kanji')}>⛩️ Kanji</button>
          </div>
          
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }} className="p-3 custom-scrollbar">
            {/* HỌC TẤT CẢ */}
            {!isSearching && (
              <button className={`btn w-100 text-start fw-bold mb-3 p-3 shadow-sm transition-all ${['lang_ja', 'all_ja', 'lang_en', 'all_en', 'lang_kanji', 'all_kanji'].includes(String(selectedSetId)) ? 'bg-primary text-white border-0' : 'bg-white text-dark border hover-bg-light'}`} style={{ borderRadius: '14px' }} onClick={() => handleSelect(`lang_${filterType}`)}>
                {filterType === 'kanji' ? '⛩️ Học tất cả Kanji' : filterType === 'en' ? '🇬🇧 Học tất cả Tiếng Anh' : '🇯🇵 Học tất cả Tiếng Nhật'}
              </button>
            )}

            {Object.keys(groupedSets).length === 0 ? (
              <div className="text-center p-4 text-muted fw-bold d-flex flex-column align-items-center">
                <span className="fs-1 mb-2">📭</span>
                Khu vực này chưa có học phần nào
              </div>
            ) : (
              Object.entries(groupedSets).map(([folder, folderSets]) => {
                const isExpanded = isSearching || expandedFolders[folder];
                const folderVocabCount = folderSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
                const isFolderSelected = String(selectedSetId) === `folder_${folder}`;

                return (
                  <div key={folder} className="mb-3 border rounded-4 overflow-hidden shadow-sm transition-all">
                    {/* FOLDER HEADER (CẤP 2) */}
                    <div 
                      className={`d-flex justify-content-between align-items-center p-3 cursor-pointer ${isFolderSelected ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                      style={{ transition: 'background-color 0.2s' }}
                      onClick={(e) => toggleFolder(folder, e)}
                    >
                      <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ cursor: 'pointer' }}>
                        <span className="fs-4">{isExpanded ? '📂' : '📁'}</span>
                        <div className="d-flex flex-column">
                          <span className="fw-bold fs-6 text-truncate" style={{ maxWidth: '200px' }}>{folder}</span>
                          <span className={`small ${isFolderSelected ? 'text-white-50' : 'text-muted'}`}>{folderVocabCount} từ</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button 
                          className={`btn btn-sm fw-bold rounded-pill shadow-sm transition-all ${isFolderSelected ? 'bg-white text-primary' : 'btn-primary'}`}
                          onClick={(e) => { e.stopPropagation(); handleSelect(`folder_${folder}`); }}
                        >
                          Học thư mục này
                        </button>
                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                      </div>
                    </div>
                    
                    {/* SETS IN FOLDER (CẤP 3) */}
                    {isExpanded && (
                      <div className="bg-white p-2 d-flex flex-column gap-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        {folderSets.map(s => {
                          const isSelected = selectedSetId == s.id;
                          const flag = s.language === 'en' ? '🇬🇧' : '🇯🇵';
                          const prefix = s.type === 'kanji' ? '⛩️' : flag;
                          return (
                            <button
                              key={s.id}
                              className={`btn w-100 text-start fw-bold d-flex justify-content-between align-items-center px-3 py-3 rounded-3 transition-all ${isSelected ? 'bg-primary text-white shadow-sm border-0' : 'bg-white text-dark border hover-bg-light'}`}
                              onClick={() => handleSelect(s.id)}
                            >
                              <div className="d-flex align-items-center gap-2 text-truncate pe-2">
                                <span>{prefix}</span>
                                <span className="text-truncate">{s.title}</span>
                              </div>
                              <span className={`badge rounded-pill ${isSelected ? 'bg-light text-primary' : 'bg-light text-muted border'}`}>{s.vocab_count || 0} thẻ</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <style jsx="true">{`
            @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
            .cursor-pointer { cursor: pointer; }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default SetSelector;