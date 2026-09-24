import React, { useState, useContext, useEffect } from 'react';
import api from '../api/axiosConfig';
import AddVocabularyForm from './AddVocabularyForm';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import { motion } from 'framer-motion';

function VocabularyList() {
  const { sets, setSets, loading, fetchSets, hasMore } = useContext(VocabContext);
  
  const [expandedSetId, setExpandedSetId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); 
  const [currentPath, setCurrentPath] = useState(""); 
  const [customFolders, setCustomFolders] = useState([]); 

  const [draggedSetId, setDraggedSetId] = useState(null);
  const [dragOverSetId, setDragOverSetId] = useState(null);
  const [customOrder, setCustomOrder] = useState(() => JSON.parse(localStorage.getItem('scofieldSetOrder')) || []);

  const [sortOption, setSortOption] = useState(() => {
    const saved = localStorage.getItem('scofieldSortOption');
    if (saved) return saved;
    const order = JSON.parse(localStorage.getItem('scofieldSetOrder')) || [];
    return order.length > 0 ? 'custom' : 'newest';
  });

  useEffect(() => { fetchSets(); }, [fetchSets]);
  useEffect(() => { localStorage.setItem('scofieldSortOption', sortOption); }, [sortOption]);
  
  const [noteModalVocab, setNoteModalVocab] = useState(null);
  const [testHistories, setTestHistories] = useState([]);

  // Gọi API lấy lịch sử test để tính toán % tiến độ khi component render
  useEffect(() => {
    api.get('/test-history?skip=0&limit=50')
      .then(res => setTestHistories(res.data))
      .catch(console.error);
  }, []);

  // --- CẤU HÌNH HIỆU ỨNG MOTION ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.toString().split(new RegExp(`(${highlight})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <mark key={i} className="bg-warning px-1 rounded">{part}</mark> : part)}</span>;
  };

  const calculateProgress = (setId, vocabCount) => {
    if (!vocabCount || vocabCount === 0) return 0;
    
    // Tìm các bài test tương ứng với set_id này và có tổng số câu hỏi khớp với số từ vựng hiện tại
    const validTests = testHistories.filter(h => h.setId === setId && h.total === vocabCount);
    if (validTests.length === 0) return 0;
    
    const maxScore = Math.max(...validTests.map(h => h.score));
    return Math.round((maxScore / vocabCount) * 100);
  };

  let displaySets = [];
  let displayFolders = [];

  const allExistingFolders = Array.from(new Set([
    ...sets.map(s => s.folder_path).filter(p => p),
    ...customFolders
  ])).sort();

  const currentLevelSets = [];
  const subfolders = new Set();

  const checkPathForFolders = (path) => {
    if (!path) return;
    if (path === currentPath) {
    } else if (path.startsWith(currentPath ? currentPath + '/' : '')) {
      const remainingPath = currentPath ? path.substring(currentPath.length + 1) : path;
      const nextFolder = remainingPath.split('/')[0];
      if (nextFolder) subfolders.add(nextFolder);
    }
  };

  sets.forEach(set => {
    const path = (set.folder_path || "").trim();
    if (path === currentPath) currentLevelSets.push(set); 
    checkPathForFolders(path);
  });

  customFolders.forEach(path => checkPathForFolders(path));
  displayFolders = Array.from(subfolders);
  
  displaySets = currentLevelSets
    .filter(set => !set.title.startsWith('_Thư mục:')) 
    .map(set => {
      let filteredVocabs = set.vocabularies ? [...set.vocabularies] : [];
      if (sortOption === 'az') filteredVocabs.sort((a, b) => a.word.localeCompare(b.word));
      else if (sortOption === 'za') filteredVocabs.sort((a, b) => b.word.localeCompare(a.word));
      else if (sortOption === 'oldest') filteredVocabs.sort((a, b) => a.id - b.id);
      else filteredVocabs.sort((a, b) => b.id - a.id);

      return { ...set, vocabularies: filteredVocabs, progress: calculateProgress(set.id, set.vocab_count || filteredVocabs.length) };
    });

  displaySets.sort((a, b) => {
    if (sortOption === 'custom') {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return b.id - a.id; 
    } else if (sortOption === 'oldest') {
      return a.id - b.id; 
    } else if (sortOption === 'az') {
      return a.title.localeCompare(b.title);
    } else if (sortOption === 'za') {
      return b.title.localeCompare(a.title);
    } else {
      return b.id - a.id; 
    }
  });

  const [editingVocabId, setEditingVocabId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [addingToSetId, setAddingToSetId] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  const toggleSet = async (setId) => {
    if (viewMode === 'grid') setViewMode('list'); 
    if (expandedSetId === setId) {
      setExpandedSetId(null);
      setAddingToSetId(null);
      return;
    }
    
    const targetSet = sets.find(s => s.id === setId);
    if (targetSet && !targetSet.vocabularies) {
      try {
        const res = await api.get(`/sets/${setId}`);
        setSets(prev => prev.map(s => s.id === setId ? { ...s, vocabularies: res.data.vocabularies } : s));
      } catch (error) {
        toast.error("Lỗi tải chi tiết học phần!");
      }
    }
    
    setExpandedSetId(setId);
    setAddingToSetId(null);
  };

  const handleCreateFolder = async () => {
    const newFolder = window.prompt("Nhập tên thư mục con mới:");
    if (newFolder && newFolder.trim()) {
      const folderName = newFolder.trim();
      const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      if (!customFolders.includes(fullPath) && !allExistingFolders.includes(fullPath)) {
        try {
          await api.post("/vocabularies/bulk-import", {
            title: `_Thư mục: ${folderName}_`, 
            raw_text: " ", 
            folder_path: fullPath
          });
          setCustomFolders([...customFolders, fullPath]);
          toast.success(`Đã tạo thư mục: ${folderName}`);
          fetchSets(false, true); 
        } catch (error) { toast.error("Lỗi khi tạo thư mục!"); }
      } else { toast.warning("Thư mục này đã tồn tại!"); }
    }
  };

  const handleDeleteFolder = async (e, folderName) => {
    e.stopPropagation(); 
    const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    if (window.confirm(`Xóa thư mục "${folderName}" sẽ xóa TOÀN BỘ các học phần bên trong. Chắc chắn chứ?`)) {
      try {
        const setsToDelete = sets.filter(s => s.folder_path === targetPath || (s.folder_path && s.folder_path.startsWith(targetPath + '/')));
        await Promise.all(setsToDelete.map(s => api.delete(`/sets/${s.id}`)));
        setCustomFolders(prev => prev.filter(p => p !== targetPath && !p.startsWith(targetPath + '/')));
        toast.success(`Đã xóa thư mục: ${folderName}`);
        fetchSets(false, true);
      } catch (error) { toast.error("Có lỗi xảy ra khi xóa thư mục!"); }
    }
  };

  const handleDeleteSet = async (e, setId, setTitle) => {
    e.stopPropagation();
    if (window.confirm(`Xóa toàn bộ học phần "${setTitle}"?`)) {
      try { await api.delete(`/sets/${setId}`); toast.success("Đã xóa học phần!"); fetchSets(false, true); } 
      catch (error) { toast.error("Xóa thất bại!"); }
    }
  };

  const handleDeleteVocab = async (vocabId) => {
    if (window.confirm("Xóa từ này?")) {
      try { await api.delete(`/vocabularies/${vocabId}`); toast.success("Đã xóa từ vựng!"); fetchSets(false, true); } 
      catch (error) { toast.error("Lỗi xóa từ vựng"); }
    }
  };

  const handleEditClick = (vocab) => {
    setAddingToSetId(null);
    setEditingVocabId(vocab.id);
    setEditWord(vocab.word);
    setEditMeaning(vocab.meaning);
  };

  const handleSaveEdit = async (vocabId) => {
    try {
      await api.put(`/vocabularies/${vocabId}`, { word: editWord, meaning: editMeaning });
      setEditingVocabId(null); toast.success("Cập nhật thành công!"); fetchSets(false, true);
    } catch (error) { toast.error("Lỗi cập nhật"); }
  };

  const handleAddClick = (setId) => {
    setEditingVocabId(null); setAddingToSetId(setId); setNewWord(''); setNewMeaning('');
  };

  const handleSaveNew = async (setId) => {
    if (!newWord.trim() || !newMeaning.trim()) return toast.warning("Nhập đủ thông tin!");
    try {
      await api.post('/vocabularies', { word: newWord.trim(), meaning: newMeaning.trim(), set_id: setId });
      toast.success("Đã thêm từ vựng mới!"); setAddingToSetId(null); fetchSets(false, true);
    } catch (error) { toast.error("Lỗi thêm từ vựng!"); }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id.toString());
    setTimeout(() => setDraggedSetId(id), 0);
  };

  const handleDrag = (e) => {
    const threshold = 120;
    const speed = 25;
    if (e.clientY === 0) return;
    if (e.clientY < threshold) window.scrollBy(0, -speed);
    else if (window.innerHeight - e.clientY < threshold) window.scrollBy(0, speed);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSetId !== targetId) setDragOverSetId(targetId);
  };

  const handleDragLeave = (e) => { e.preventDefault(); };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverSetId(null);
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) { setDraggedSetId(null); return; }
    
    const draggedId = parseInt(draggedIdStr, 10);
    if (draggedId === targetId) { setDraggedSetId(null); return; }

    const currentIds = displaySets.map(s => s.id);
    const draggedIdx = currentIds.indexOf(draggedId);
    const targetIdx = currentIds.indexOf(targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrderedIds = [...currentIds];
      newOrderedIds.splice(draggedIdx, 1);
      newOrderedIds.splice(targetIdx, 0, draggedId);
      const mergedOrder = [...new Set([...newOrderedIds, ...customOrder])];
      setCustomOrder(mergedOrder);
      localStorage.setItem('scofieldSetOrder', JSON.stringify(mergedOrder));
      setSortOption('custom'); 
    }
    setDraggedSetId(null);
  };

  const handleDragEnd = () => { setDraggedSetId(null); setDragOverSetId(null); };

  const handleDownloadSet = async (e, set, format) => {
    e.stopPropagation();
    
    // Kiểm tra xem đã tải chi tiết từ vựng chưa, nếu chưa thì gọi API lấy
    let vocabsToExport = set.vocabularies;
    if (!vocabsToExport) {
      try {
        const res = await api.get(`/sets/${set.id}`);
        vocabsToExport = res.data.vocabularies;
      } catch (error) {
        toast.error("Lỗi tải dữ liệu để xuất file!");
        return;
      }
    }

    if (!vocabsToExport || vocabsToExport.length === 0) {
      toast.warning("Học phần này chưa có từ vựng!");
      return;
    }

    let content = "";
    // Đặt tên file loại bỏ các ký tự đặc biệt không hợp lệ
    let filename = `${set.title.replace(/[/\\?%*:|"<>]/g, '-')}.${format}`;

    if (format === 'txt') {
      content = vocabsToExport.map(v => `${v.word} | ${v.meaning}`).join('\n');
    } else if (format === 'csv') {
      // Dùng \uFEFF (BOM) để Excel nhận diện đúng tiếng Việt UTF-8
      content = '\uFEFF' + "Từ vựng,Ý nghĩa\n" + vocabsToExport.map(v => `"${v.word.replace(/"/g, '""')}","${v.meaning.replace(/"/g, '""')}"`).join('\n');
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-4 mx-auto" style={{ maxWidth: '1000px' }}>
      
      <div id="add-vocab-section">
        <AddVocabularyForm 
          onAddSuccess={() => fetchSets(false, true)} 
          existingFolders={allExistingFolders} 
          currentPath={currentPath} 
        />
      </div>

      {noteModalVocab && (
        <SaveNoteModal 
          vocab={noteModalVocab} 
          sets={sets} 
          onClose={() => setNoteModalVocab(null)} 
          onSaveSuccess={() => fetchSets(false, true)} 
        />
      )}

      {/* TÊU ĐỀ & LỌC */}
      <div className="d-flex flex-column flex-lg-row gap-3 mb-4 fade-in-slide align-items-lg-center justify-content-between">
        <h3 className="fw-bold m-0 text-primary">Thư viện của bạn</h3>
        <div className="d-flex flex-wrap flex-md-nowrap gap-3 justify-content-end">
          <select 
            className="form-select form-select-lg bg-white border-0 shadow-sm rounded-pill fw-bold text-muted custom-select-fix"
            value={sortOption} onChange={(e) => setSortOption(e.target.value)}
            style={{ height: '54px', minWidth: '160px', cursor: 'pointer' }}
          >
            <option value="custom" disabled={customOrder.length === 0}>Tùy chỉnh (Kéo thả)</option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất (1 - 9)</option>
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
          </select>
          <div className="d-none d-md-flex align-items-center bg-white p-1 shadow-sm border" style={{ height: '54px', borderRadius: '50px' }}>
            <button 
              className={`border-0 h-100 d-flex align-items-center justify-content-center transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`} 
              style={{ width: '64px', borderRadius: '40px' }} 
              onClick={() => setViewMode('list')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            <button 
              className={`border-0 h-100 d-flex align-items-center justify-content-center transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`} 
              style={{ width: '64px', borderRadius: '40px' }} 
              onClick={() => setViewMode('grid')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG THƯ MỤC */}
      {true && (
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white px-4 py-3 rounded-pill shadow-sm fade-in-slide">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <button className={`btn btn-sm rounded-pill fw-bold ${currentPath === "" ? 'btn-primary shadow-sm' : 'btn-light'}`} onClick={() => setCurrentPath("")}>
              🏠 Gốc
            </button>
            {currentPath && currentPath.split('/').map((part, idx, arr) => {
              const pathToHere = arr.slice(0, idx + 1).join('/');
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={idx}>
                  <span className="text-muted fw-bold">/</span>
                  <button className={`btn btn-sm rounded-pill fw-bold ${isLast ? 'btn-primary shadow-sm' : 'btn-light'}`} onClick={() => setCurrentPath(pathToHere)}>
                    {part}
                  </button>
                </React.Fragment>
              )
            })}
          </div>
          
          <button className="btn btn-outline-primary btn-sm rounded-pill fw-bold px-3 d-flex align-items-center gap-2 transition-all hover-bg-light" onClick={handleCreateFolder}>
            <span className="fs-6">📁</span> <span className="d-none d-sm-block">Thư mục mới</span>
          </button>
        </div>
      )}

      {/* DANH SÁCH THƯ MỤC CON */}
      {displayFolders.length > 0 && (
        <div className="row g-3 mb-5 fade-in">
          {displayFolders.map(folderName => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div 
                className="card shadow-sm border-0 rounded-4 h-100 bg-white transition-all hover-scale" 
                style={{cursor: 'pointer'}}
                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)}
              >
                <div className="card-body d-flex align-items-center justify-content-between p-3">
                  <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="fs-3">📁</span>
                    <h6 className="fw-bold mb-0 text-dark text-truncate" title={folderName}>{folderName}</h6>
                  </div>
                  <button 
                    className="btn btn-sm btn-light text-danger rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm ms-2 transition-all hover-bg-danger hover-text-white"
                    style={{ width: '32px', height: '32px', flexShrink: 0 }}
                    onClick={(e) => handleDeleteFolder(e, folderName)}
                    title="Xóa thư mục này"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DANH SÁCH HỌC PHẦN ĐƯỢC BỌC MOTION ĐỂ TẠO HIỆU ỨNG LƯỚT LÊN TUẦN TỰ */}
      {sets.length === 0 ? (
        <EmptyState title="Thư viện trống" message="Chưa có học phần nào. Hãy tạo mới ở phần trên nhé!" />
      ) : displaySets.length === 0 && displayFolders.length === 0 ? (
        <div className="text-center text-muted mt-5 fw-bold fs-5">Khu vực này hiện đang trống.</div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className={viewMode === 'grid' ? 'row g-4' : ''}>
          {displaySets.map((vocabSet) => {
            const isDragged = draggedSetId === vocabSet.id;
            const isDragOver = dragOverSetId === vocabSet.id && !isDragged;

            return (
            <motion.div 
              variants={itemVariants}
              key={vocabSet.id} 
              className={viewMode === 'grid' ? 'col-md-6 col-xl-4' : 'mb-4'}
              draggable
              onDragStart={(e) => handleDragStart(e, vocabSet.id)}
              onDrag={(e) => handleDrag(e)}
              onDragOver={(e) => handleDragOver(e, vocabSet.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, vocabSet.id)}
              onDragEnd={handleDragEnd}
            >
              <div 
                className="card border-0 rounded-4 h-100 transition-all bg-white"
                style={{ 
                  opacity: isDragged ? 0.4 : 1, 
                  transform: isDragged ? 'scale(0.96)' : isDragOver ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isDragOver ? '0 12px 24px rgba(134,59,255,0.2)' : '0 4px 12px rgba(0,0,0,0.04)',
                  border: isDragOver ? '2px dashed var(--bs-primary)' : '2px solid transparent',
                  zIndex: isDragOver ? 10 : 1
                }}
              >
                <div 
                  className={`card-header bg-transparent p-4 border-0 rounded-4 d-flex ${viewMode === 'grid' ? 'flex-column align-items-start gap-3' : 'justify-content-between align-items-center'}`}
                  style={{ cursor: isDragged ? 'grabbing' : 'grab' }}
                  onClick={() => toggleSet(vocabSet.id)}
                >
                  <div className={viewMode === 'grid' ? 'w-100' : ''}>
                    <h5 className="mb-2 fw-bold text-dark text-truncate" title={vocabSet.title}>
                      {vocabSet.title}
                    </h5>
                    <span className="badge bg-light text-muted border px-2 py-1">{vocabSet.vocab_count} thuật ngữ</span>
                    
                    <div className="mt-3 w-100">
                      <div className="d-flex justify-content-between text-muted fw-bold mb-2" style={{ fontSize: '0.8rem' }}>
                        <span>Tiến độ</span>
                        <span>{vocabSet.progress}%</span>
                      </div>
                      <div className="progress rounded-pill bg-light" style={{ height: '6px' }}>
                        <div className="progress-bar bg-success rounded-pill" style={{ width: `${vocabSet.progress}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className={`d-flex align-items-center gap-2 ${viewMode === 'grid' ? 'w-100 justify-content-between mt-2' : ''}`}>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-light text-primary fw-bold border-0 px-2 py-2" onClick={(e) => handleDownloadSet(e, vocabSet, 'txt')} title="Tải file Text">⬇️ TXT</button>
                      <button className="btn btn-sm btn-light text-success fw-bold border-0 px-2 py-2" onClick={(e) => handleDownloadSet(e, vocabSet, 'csv')} title="Tải file Excel">⬇️ Excel</button>
                      <button className="btn btn-sm btn-light text-danger fw-bold border-0 px-3 py-2" onClick={(e) => handleDeleteSet(e, vocabSet.id, vocabSet.title)}>🗑️ Xóa</button>
                    </div>
                    {viewMode === 'list' && (
                      <span className="text-muted fs-5 ms-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width:'35px', height:'35px' }}>
                        {expandedSetId === vocabSet.id ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </div>

                {expandedSetId === vocabSet.id && viewMode === 'list' && (
                  <div className="card-body p-0 border-top bg-light rounded-bottom-4 fade-in-slide" style={{ cursor: 'default' }}>
                    <div className="list-group list-group-flush rounded-bottom-4">
                      
                      {vocabSet.vocabularies?.length === 0 && addingToSetId !== vocabSet.id && (
                        <div className="text-center py-4 text-muted fst-italic border-bottom border-light">Học phần trống. Hãy thêm thẻ đầu tiên!</div>
                      )}

                      {vocabSet.vocabularies?.map((vocab) => (
                        <div key={vocab.id} className="list-group-item bg-white p-4 border-bottom border-light">
                          {editingVocabId === vocab.id ? (
                            <div className="row g-2 align-items-center">
                              <div className="col-sm-5">
                                <input type="text" className="form-control bg-light border-0" value={editWord} onChange={(e) => setEditWord(e.target.value)} autoFocus placeholder="Thuật ngữ" />
                              </div>
                              <div className="col-sm-5">
                                <input type="text" className="form-control bg-light border-0" value={editMeaning} onChange={(e) => setEditMeaning(e.target.value)} placeholder="Định nghĩa" />
                              </div>
                              <div className="col-sm-2 text-end">
                                <button className="btn btn-success fw-bold me-2 px-3" onClick={() => handleSaveEdit(vocab.id)}>Lưu</button>
                                <button className="btn btn-secondary fw-bold px-3" onClick={() => setEditingVocabId(null)}>Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <div className="row align-items-center">
                              <div className="col-sm-5 border-end border-2 border-light d-flex align-items-center gap-3">
                                <button 
                                  className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center p-0 shadow-sm hover-scale transition-all"
                                  style={{ width: '40px', height: '40px', color: '#8a2be2', fontSize: '1.2rem' }}
                                  onClick={(e) => { e.stopPropagation(); setNoteModalVocab(vocab); }}
                                  title="Lưu vào Note"
                                >📓</button>
                                <div className="ms-1 text-truncate">
                                  <div className="fw-bold fs-5 text-dark">{vocab.word}</div>
                                </div>
                              </div>
                              <div className="col-sm-5 text-dark ps-4 text-truncate fs-5">
                                {vocab.meaning}
                              </div>
                              <div className="col-sm-2 text-end">
                                <button className="btn btn-sm btn-light text-primary fw-bold px-3 py-2 me-2" onClick={() => handleEditClick(vocab)}>✏️ Sửa</button>
                                <button className="btn btn-sm btn-light text-danger fw-bold px-2 py-2" onClick={() => handleDeleteVocab(vocab.id)}>🗑️</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {addingToSetId === vocabSet.id ? (
                        <div className="list-group-item bg-white p-4 border-top border-primary border-2">
                          <div className="row g-2 align-items-center">
                            <div className="col-sm-5">
                              <input type="text" className="form-control bg-light border-0" value={newWord} onChange={(e) => setNewWord(e.target.value)} autoFocus placeholder="Từ vựng mới" />
                            </div>
                            <div className="col-sm-5">
                              <input type="text" className="form-control bg-light border-0" value={newMeaning} onChange={(e) => setNewMeaning(e.target.value)} placeholder="Định nghĩa" />
                            </div>
                            <div className="col-sm-2 text-end">
                              <button className="btn btn-primary fw-bold me-2 px-3" onClick={() => handleSaveNew(vocabSet.id)}>Lưu</button>
                              <button className="btn btn-secondary fw-bold px-3" onClick={() => setAddingToSetId(null)}>Hủy</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="list-group-item bg-light p-3 text-center border-0 rounded-bottom-4">
                          <button 
                            className="btn btn-outline-primary fw-bold rounded-pill px-4" 
                            style={{ borderStyle: 'dashed', borderWidth: '2px' }}
                            onClick={() => handleAddClick(vocabSet.id)}
                          >
                            + Thêm thẻ mới
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            );
          })}
        </motion.div>
      )}

      {hasMore && sets.length > 0 && (
        <div className="text-center mt-5 mb-5">
          <button className="btn btn-outline-primary px-5 py-3 fs-5 fw-bold rounded-pill shadow-sm" onClick={() => fetchSets(true)}>
            Tải thêm học phần cũ ↓
          </button>
        </div>
      )}  
    </div>
  );
}

export default VocabularyList;