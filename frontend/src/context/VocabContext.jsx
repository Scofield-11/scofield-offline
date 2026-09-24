import React, { createContext, useState, useCallback } from 'react';
import api from '../api/axiosConfig';

export const VocabContext = createContext();

export const VocabProvider = ({ children }) => {
  const [sets, setSets] = useState([]);
  const [allVocabs, setAllVocabs] = useState([]);
  const [kanjiSets, setKanjiSets] = useState([]);
  const [globalStats, setGlobalStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false); // Tắt nút xem thêm
  const LIMIT = 1000; // Tải tối đa 1000 học phần trong 1 lần
  const [studyProgress, setStudyProgress] = useState(0);

  const [hasFetchedSets, setHasFetchedSets] = useState(false);
  const [hasFetchedVocabs, setHasFetchedVocabs] = useState(false);
  const [hasFetchedKanjiSets, setHasFetchedKanjiSets] = useState(false);

  const fetchSets = useCallback(async (isLoadMore = false, forceRefresh = false) => {
    if (hasFetchedSets && !isLoadMore && !forceRefresh) return;
    if (!isLoadMore) setLoading(true);
    try {
      const currentSkip = isLoadMore ? (page + 1) * LIMIT : 0;
      const res = await api.get(`/sets?skip=${currentSkip}&limit=${LIMIT}`);
      if (isLoadMore) {
        setSets(prev => [...prev, ...res.data]);
        setPage(page + 1);
      } else {
        setSets(res.data);
        setPage(0);
      }
      setHasMore(res.data.length === LIMIT);
      setHasFetchedSets(true);
    } catch (error) {
      console.error("Lỗi khi tải danh sách học phần:", error);
    } finally {
      if (!isLoadMore) setLoading(false);
    }
  }, [hasFetchedSets, page]);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const res = await api.get('/stats/global');
      setGlobalStats(res.data);
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
    }
  }, []);

  const fetchAllVocabs = useCallback(async (forceRefresh = false) => {
    if (hasFetchedVocabs && !forceRefresh) return;
    setLoading(true);
    try {
      // Ép limit lên 100,000 để lấy toàn bộ từ vựng
      const res = await api.get('/vocabularies?limit=100000'); 
      setAllVocabs(res.data);
      setHasFetchedVocabs(true);
    } catch (error) {
      console.error("Lỗi khi tải tất cả từ vựng:", error);
    } finally {
      setLoading(false);
    }
  }, [hasFetchedVocabs]);

  const fetchKanjiSets = useCallback(async (forceRefresh = false) => {
    if (hasFetchedKanjiSets && !forceRefresh) return;
    setLoading(true);
    try {
      const res = await api.get('/kanji-sets');
      setKanjiSets(res.data);
      setHasFetchedKanjiSets(true);
    } catch (error) {
      console.error("Lỗi khi tải danh sách Kanji:", error);
    } finally {
      setLoading(false);
    }
  }, [hasFetchedKanjiSets]);

  return (
    <VocabContext.Provider value={{ sets, setSets, allVocabs, kanjiSets, setKanjiSets, globalStats, fetchGlobalStats, loading, fetchSets, fetchAllVocabs, fetchKanjiSets, hasMore, studyProgress, setStudyProgress }}>
      {children}
    </VocabContext.Provider>
  );
};