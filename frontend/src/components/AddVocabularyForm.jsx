import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function AddVocabularyForm({ onAddSuccess, existingFolders = [], currentPath = "" }) {
  const [title, setTitle] = useState('');
  const [folderPath, setFolderPath] = useState(currentPath); 
  const [bulkText, setBulkText] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importMode, setImportMode] = useState('text'); 
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Tự động chọn thư mục đích là thư mục người dùng đang đứng xem
  useEffect(() => {
    setFolderPath(currentPath);
  }, [currentPath]);

  const handleBulkImport = async () => {
    if (!title.trim()) return toast.warning("Vui lòng nhập tên học phần!");
    if (importMode === 'text' && !bulkText.trim()) return toast.warning("Vui lòng nhập danh sách từ vựng!");
    if (importMode === 'csv' && !csvFile) return toast.warning("Vui lòng chọn file CSV!");

    setIsLoading(true);
    try {
      let response;
      if (importMode === 'text') {
        response = await api.post("/vocabularies/bulk-import", {
          title: title.trim(),
          raw_text: bulkText,
          folder_path: folderPath.trim() 
        });
      } else {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("folder_path", folderPath.trim()); 
        formData.append("file", csvFile);
        response = await api.post("/vocabularies/import-csv", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      
      toast.success(response.data.message);
      setTitle("");
      setBulkText("");
      setCsvFile(null);
      setIsExpanded(false);
      if (onAddSuccess) onAddSuccess(); 
    } catch (error) {
      toast.error(error.response?.data?.detail || "Có lỗi xảy ra, kiểm tra lại định dạng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].name.endsWith('.csv')) setCsvFile(files[0]);
      else toast.error("Vui lòng chỉ tải lên file định dạng .csv");
    }
  };

  return (
    <div className="card shadow-sm mb-5 border-0 rounded-4">
      <div 
        className="card-header bg-white py-4 border-0 d-flex justify-content-between align-items-center rounded-4"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h5 className="mb-0 fw-bold text-primary">
          {isExpanded ? '➖' : '➕'} Tạo học phần mới (Nhập nhanh)
        </h5>
      </div>
      
      {isExpanded && (
        <div className="card-body p-4 border-top">
          <input 
            type="text" 
            className="form-control form-control-lg mb-4 fw-bold text-dark bg-light border-0" 
            placeholder="Nhập tên học phần (VD: Bài 1 - Minna no Nihongo)..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ borderRadius: '12px' }}
          />

          <div className="mb-4 fade-in-slide">
            <label className="text-muted small fw-bold mb-2">LƯU VÀO THƯ MỤC</label>
            <div className="input-group input-group-lg shadow-sm rounded-4">
              <span className="input-group-text bg-light border-0" style={{ borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>📁</span>
              <select 
                className="form-select bg-light border-0 fw-bold text-dark"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                style={{ borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}
              >
                <option value="">-- Thư mục gốc (Mặc định) --</option>
                {existingFolders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 d-flex gap-3 fade-in-slide">
            <button className={`btn fw-bold ${importMode === 'text' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setImportMode('text')}>Dán văn bản</button>
            <button className={`btn fw-bold ${importMode === 'csv' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setImportMode('csv')}>Tải lên file CSV</button>
          </div>

          {importMode === 'text' ? (
            <div className="mb-4 fade-in-slide">
              <label className="text-muted small fw-bold mb-2">DANH SÁCH TỪ VỰNG (Từ vựng | Ý nghĩa)</label>
              <textarea 
                  className="form-control bg-light border-0 p-3" 
                  rows="6" 
                  placeholder="守ります | Bảo vệ, tuân thủ&#10;外します | Rời, không có ở&#10;Cái bàn | Desk"
                  value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                  style={{ resize: 'none', borderRadius: '12px', lineHeight: '1.6' }}
              ></textarea>
            </div>
          ) : (
            <div className="mb-4 fade-in-slide">
              <label className="text-muted small fw-bold mb-2">CHỌN FILE CSV (Cột 1: Từ vựng, Cột 2: Ý nghĩa)</label>
              <div 
                className={`d-flex flex-column align-items-center justify-content-center p-5 rounded-4 transition-all ${isDragging ? 'bg-primary text-white border-primary' : 'bg-light text-muted'}`}
                style={{ border: `2px dashed ${isDragging ? 'var(--bs-primary)' : '#ccc'}`, cursor: 'pointer', minHeight: '200px' }}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              >
                <span className="fs-1 mb-2">{csvFile ? '📄' : '📥'}</span>
                <span className="fw-bold fs-5 mb-1">{csvFile ? csvFile.name : 'Kéo thả file CSV vào đây'}</span>
                <span className="small opacity-75">hoặc click để duyệt file</span>
                <input type="file" ref={fileInputRef} className="d-none" accept=".csv" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setCsvFile(e.target.files[0]); }} />
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end">
            <button className="btn btn-primary px-5 py-2 fw-bold" onClick={handleBulkImport} disabled={isLoading} style={{ borderRadius: '10px' }}>
              {isLoading ? 'Đang xử lý...' : 'Tạo học phần'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddVocabularyForm;