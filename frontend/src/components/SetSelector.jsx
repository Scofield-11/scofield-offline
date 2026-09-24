import React, { useState, useEffect, useRef } from 'react';

function SetSelector({ sets, selectedSetId, setSelectedSetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const dropdownRef = useRef(null);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validSets = sets.filter(s => !s.title.startsWith('_Thư mục:'));
  
  const filteredSets = validSets.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSets = filteredSets.reduce((acc, set) => {
    const folder = set.folder_path || '🏠 Thư mục gốc';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(set);
    return acc;
  }, {});

  const isSearching = searchTerm.trim().length > 0;

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSelect = (id) => {
    setSelectedSetId(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  let selectedDisplay = "-- Tất cả từ vựng --";
  if (selectedSetId !== 'all') {
    const selected = validSets.find(s => s.id == selectedSetId);
    if (selected) selectedDisplay = selected.title;
  }

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      <button
        type="button"
        className="btn form-select form-select-lg bg-light border-0 fw-bold text-dark shadow-sm text-start w-100 d-flex justify-content-between align-items-center"
        style={{ borderRadius: '12px', height: '56px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-truncate pe-3">{selectedDisplay}</span>
      </button>

      {isOpen && (
        <div 
          className="position-absolute w-100 bg-white shadow-lg rounded-4 mt-2 overflow-hidden fade-in" 
          style={{ zIndex: 1050, top: '100%', left: 0, border: '1px solid #eee' }}
        >
          <div className="p-3 border-bottom bg-light">
            <input
              type="text"
              className="form-control fw-bold border-0 shadow-sm rounded-pill"
              placeholder="🔍 Tìm tên học phần..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: '35vh', overflowY: 'auto' }} className="p-2">
            {!isSearching && (
              <button 
                className={`btn w-100 text-start fw-bold mb-1 ${selectedSetId === 'all' ? 'bg-primary text-white' : 'btn-light text-dark hover-bg-light'}`}
                style={{ borderRadius: '10px' }}
                onClick={() => handleSelect('all')}
              >
                -- Tất cả từ vựng --
              </button>
            )}

            {Object.keys(groupedSets).length === 0 ? (
              <div className="text-center p-3 text-muted">Không tìm thấy học phần</div>
            ) : (
              Object.entries(groupedSets).map(([folder, folderSets]) => {
                const isExpanded = isSearching || expandedFolders[folder];
                const folderVocabCount = folderSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);

                return (
                  <div key={folder} className="mb-2">
                    <button
                      className="btn w-100 text-start fw-bold d-flex justify-content-between align-items-center px-3 py-2 text-muted"
                      style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem' }}
                      onClick={() => toggleFolder(folder)}
                    >
                      <span className="text-truncate" style={{ maxWidth: '80%' }}>📁 {folder} ({folderVocabCount} từ)</span>
                      <span>{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    
                    {isExpanded && (
                      <div className="ps-3 pe-1 pt-1 d-flex flex-column gap-1 mt-1">
                        {folderSets.map(s => {
                          const isSelected = selectedSetId == s.id;
                          return (
                            <button
                              key={s.id}
                              className={`btn w-100 text-start fw-bold d-flex justify-content-between align-items-center px-3 py-2 ${isSelected ? 'bg-primary text-white shadow-sm' : 'bg-white text-dark hover-bg-light'}`}
                              style={{ borderRadius: '8px', transition: 'all 0.2s' }}
                              onClick={() => handleSelect(s.id)}
                            >
                              <span className="text-truncate pe-2">{s.title}</span>
                              <span className={`badge ${isSelected ? 'bg-light text-primary' : 'bg-light text-muted border'} ms-auto`}>{s.vocab_count || 0} từ</span>
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
        </div>
      )}
    </div>
  );
}

export default SetSelector;