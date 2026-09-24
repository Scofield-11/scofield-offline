import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { VocabContext } from '../context/VocabContext';

function Dashboard() {
  const { sets } = useContext(VocabContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [todayTests, setTodayTests] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    // Lấy 100 lịch sử gần nhất để tính toán chuỗi liên tiếp và bài làm hôm nay
    api.get('/test-history?skip=0&limit=100')
      .then(res => {
        const history = res.data;
        
        const activeDates = [...new Set(history.map(item => {
          const match = item.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
        }).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));

        const today = new Date();
        const tzTodayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        
        const tTests = history.filter(item => {
          const match = item.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return match && `${match[3]}-${match[2]}-${match[1]}` === tzTodayStr;
        }).length;
        
        setTodayTests(tTests);

        let streak = 0;
        let checkDate = new Date();
        if (activeDates.includes(tzTodayStr)) {
          streak = 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          const yestStr = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
          if (activeDates.includes(yestStr)) {
            checkDate = yest;
          }
        }

        while(true) {
          const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
          if (activeDates.includes(dStr)) {
            if (dStr !== tzTodayStr) streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        setCurrentStreak(streak);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        api.get(`/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => {
            setSearchResults(res.data);
            setShowDropdown(true);
          })
          .catch(err => console.error(err))
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="container-fluid mt-2 mb-4 mx-auto" style={{ maxWidth: '1000px' }}>
      <div className="row g-4 fade-in-slide align-items-stretch">
        {/* Tầng 1: Hero Banner (Tìm kiếm) */}
        <div className="col-12 position-relative" style={{ zIndex: 10 }}>
          <div className="card shadow-sm border-0 rounded-4 bg-primary text-white h-100 position-relative overflow-visible p-3">
            <div className="card-body p-4 position-relative text-center" style={{ zIndex: 2 }}>
              <h3 className="fw-bold mb-3 display-6">Hôm nay bạn muốn học gì? 🚀</h3>
              
              <div className="position-relative mx-auto" style={{ maxWidth: '600px' }} ref={dropdownRef}>
                <div className="input-group input-group-lg shadow-sm rounded-pill overflow-hidden">
                  <span className="input-group-text bg-white border-0 ps-4">🔍</span>
                  <input 
                    type="text" 
                    className="form-control border-0 py-3 fw-bold text-dark shadow-none" 
                    placeholder="Tìm kiếm từ vựng, ý nghĩa..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if(searchResults.length > 0) setShowDropdown(true); }}
                  />
                </div>

                {showDropdown && (
                  <div className="position-absolute w-100 bg-white shadow-lg rounded-4 mt-2 overflow-hidden text-start" style={{ zIndex: 1050, top: '100%', left: 0, border: '1px solid #eee' }}>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="p-2">
                      {isSearching ? (
                        <div className="text-center p-3 text-muted">Đang tìm...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center p-3 text-muted">Không tìm thấy kết quả phù hợp.</div>
                      ) : (
                        searchResults.map((item, idx) => {
                          const parentSet = sets.find(s => s.id === item.set_id);
                          const setTitle = parentSet ? parentSet.title : 'Chưa phân loại';
                          return (
                            <div key={idx} className="p-3 border-bottom border-light hover-bg-light transition-all rounded-3 mb-1">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="fw-bold fs-5 text-dark">{item.word}</div>
                                <span className="badge bg-light text-primary border text-wrap text-end ms-3" style={{ fontSize: '0.75rem', maxWidth: '60%' }}>{setTitle}</span>
                              </div>
                              <div className="text-muted">{item.meaning}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="position-absolute" style={{ top: '-50%', left: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', zIndex: 1 }}></div>
            <div className="position-absolute" style={{ bottom: '-30%', right: '-5%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.12)', borderRadius: '50%', zIndex: 1 }}></div>
          </div>
        </div>

        {/* Tầng 2: Grid 2 cột */}
        <div className="col-lg-6">
          {/* Gamification */}
          <div className="card shadow-sm border-0 rounded-4 bg-white h-100 overflow-hidden">
            <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <span className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>📈</span>
                Thống kê học tập
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="d-flex gap-3 h-100">
                <div className="flex-grow-1 position-relative bg-success bg-opacity-10 rounded-4 p-3 border border-success border-opacity-25 d-flex flex-column justify-content-center overflow-hidden transition-all hover-scale">
                  <div className="position-relative" style={{ zIndex: 2 }}>
                    <span className="fw-bold text-success small d-block mb-1">TEST HÔM NAY</span>
                    <h2 className="fw-bold text-success mb-0">{todayTests} <span className="fs-5 fw-normal">bài</span></h2>
                  </div>
                  <div className="position-absolute fs-1" style={{ right: '-5px', bottom: '-15px', opacity: 0.15 }}>📝</div>
                </div>

                <div className="flex-grow-1 position-relative bg-danger bg-opacity-10 rounded-4 p-3 border border-danger border-opacity-25 d-flex flex-column justify-content-center overflow-hidden transition-all hover-scale">
                  <div className="position-relative" style={{ zIndex: 2 }}>
                    <span className="fw-bold text-danger small d-block mb-1">CHUỖI LIÊN TIẾP</span>
                    <h2 className="fw-bold text-danger mb-0">{currentStreak} <span className="fs-5 fw-normal">ngày</span></h2>
                  </div>
                  <div className="position-absolute fs-1" style={{ right: '-5px', bottom: '-15px', opacity: 0.15 }}>🔥</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          {/* Quick Actions */}
          <div className="d-flex gap-3 h-100">
            <Link to="/flashcards" className="btn bg-white border w-50 py-4 fw-bold text-primary shadow-sm rounded-4 d-flex align-items-center justify-content-center flex-column hover-bg-light transition-all h-100">
              <span className="display-6 mb-2">🗂️</span>
              <span className="fs-5 mt-1">Flashcards</span>
            </Link>
            
            <Link to="/test" className="btn bg-white border w-50 py-4 fw-bold text-success shadow-sm rounded-4 d-flex align-items-center justify-content-center flex-column hover-bg-light transition-all h-100">
              <span className="display-6 mb-2">📝</span>
              <span className="fs-5 mt-1">Kiểm tra</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;