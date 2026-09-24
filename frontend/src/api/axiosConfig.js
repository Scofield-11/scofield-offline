import localforage from 'localforage';

// 1. Cấu hình Database Offline trên điện thoại
localforage.config({
  name: 'ScofieldOfflineDB',
  storeName: 'data'
});

// Hàm lấy toàn bộ dữ liệu (hoặc khởi tạo rỗng nếu tải lần đầu)
const getDB = async () => {
  let db = await localforage.getItem('db');
  if (!db) {
    db = { sets: [], vocabularies: [], kanjiSets: [], kanjis: [], exams: [], testHistories: [] };
    await localforage.setItem('db', db);
  }
  return db;
};
const saveDB = async (db) => await localforage.setItem('db', db);
const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

// 2. Chặn các Request API và xử lý bằng Database Offline
const api = {
  get: async (url) => {
     const db = await getDB();
     if (url.includes('/stats/global')) return { data: { total: db.vocabularies.length } };
     
     // Xử lý Vocab Sets
     if (url.startsWith('/sets') && !url.includes('/sets/')) {
        const setsData = db.sets.map(s => ({ ...s, vocab_count: db.vocabularies.filter(v => v.set_id === s.id).length })).sort((a,b) => b.id - a.id);
        return { data: setsData };
     }
     if (url.startsWith('/sets/')) {
        const id = parseInt(url.split('/').pop());
        const set = db.sets.find(s => s.id === id);
        if(set) { set.vocabularies = db.vocabularies.filter(v => v.set_id === id); return { data: set }; }
     }

     if (url.startsWith('/vocabularies')) return { data: db.vocabularies };

     // Xử lý Kanji Sets
     if (url.startsWith('/kanji-sets') && !url.includes('/kanji-sets/')) {
        const kSets = db.kanjiSets.map(s => ({ ...s, vocab_count: db.kanjis.filter(k => k.kanji_set_id === s.id).length })).sort((a,b) => b.id - a.id);
        return { data: kSets };
     }
     if (url.startsWith('/kanji-sets/')) {
        const id = parseInt(url.split('/').pop());
        const set = db.kanjiSets.find(s => s.id === id);
        if(set) { set.kanjis = db.kanjis.filter(k => k.kanji_set_id === id); return { data: set }; }
     }
     
     // Xử lý Test & Exam
     if (url.startsWith('/test-history')) return { data: db.testHistories.sort((a,b) => b.id - a.id) };
     if (url.startsWith('/exams') && !url.includes('/exams/')) return { data: db.exams.sort((a,b) => b.id - a.id) };
     if (url.startsWith('/exams/')) return { data: db.exams.find(e => e.id === parseInt(url.split('/').pop())) };
     
     return { data: [] };
  },

  post: async (url, data) => {
     const db = await getDB();
     
     // Import Từ vựng (Text)
     if (url.startsWith('/vocabularies/bulk-import')) {
        const newSet = { id: generateId(), title: data.title, folder_path: data.folder_path || "", created_at: new Date().toISOString() };
        db.sets.push(newSet);
        if (data.raw_text) {
           data.raw_text.trim().split('\n').forEach(line => {
              const parts = line.split('|').map(p => p.trim());
              if(parts.length >= 2 && parts[0] && parts[1]) db.vocabularies.push({ id: generateId(), word: parts[0], meaning: parts[1], set_id: newSet.id });
           });
        }
        await saveDB(db); return { data: { message: "Tạo học phần thành công" } };
     }

     // Import Từ vựng (CSV)
     if (url.startsWith('/vocabularies/import-csv')) {
        const file = data.get('file');
        const title = data.get('title');
        const folder_path = data.get('folder_path') || "";
        const text = await file.text();
        const newSet = { id: generateId(), title: title, folder_path: folder_path, created_at: new Date().toISOString() };
        db.sets.push(newSet);
        text.trim().split('\n').forEach(line => {
           const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim()); // Xóa ngoặc kép CSV
           if(parts.length >= 2 && parts[0] && parts[1] && parts[0].toLowerCase() !== 'từ vựng') {
              db.vocabularies.push({ id: generateId(), word: parts[0], meaning: parts[1], set_id: newSet.id });
           }
        });
        await saveDB(db); return { data: { message: "Tạo học phần từ CSV thành công" } };
     }
     
     // Thêm 1 từ vựng (Save Note)
     if (url === '/vocabularies') {
        const newVocab = { id: generateId(), word: data.word, meaning: data.meaning, set_id: data.set_id };
        db.vocabularies.push(newVocab);
        await saveDB(db); return { data: newVocab };
     }
     
     // Import Kanji
     if (url.startsWith('/kanji-sets/bulk-import')) {
        const newSet = { id: generateId(), title: data.title, folder_path: data.folder_path || "", created_at: new Date().toISOString() };
        db.kanjiSets.push(newSet);
        if (data.raw_text) {
           data.raw_text.trim().split('\n').forEach(line => {
              const parts = line.split('|').map(p => p.trim());
              if(parts.length >= 4) db.kanjis.push({ id: generateId(), kanji: parts[0], hanviet: parts[1], hiragana: parts[2], meaning: parts[3], kanji_set_id: newSet.id });
           });
        }
        await saveDB(db); return { data: { message: "Tạo học phần Kanji thành công" } };
     }
     
     // Import Exam
     if (url.startsWith('/exams/import')) {
        const newExam = { id: generateId(), title: data.title, questions: [] };
        if (data.raw_text) {
           data.raw_text.trim().split('\n').forEach((line, idx) => {
              const parts = line.split('|').map(p => p.trim());
              if(parts.length === 6) newExam.questions.push({ id: generateId() + idx, question: parts[0], options: [parts[1], parts[2], parts[3], parts[4]], correct_ans: parseInt(parts[5]) });
           });
        }
        db.exams.push(newExam); await saveDB(db); return { data: { message: "Tạo bài thi thành công" } };
     }

     // Lịch sử test
     if (url.startsWith('/test-history')) {
         db.testHistories.push({ id: generateId(), setId: data.set_id, title: data.title, score: data.score, total: data.total, date: new Date().toLocaleDateString('vi-VN'), full_date: new Date().toLocaleString('vi-VN'), wrongDetails: data.wrong_details });
         await saveDB(db); return { data: { message: "Đã lưu lịch sử" } };
     }
     
     return { data: {} };
  },
  
  put: async (url, data) => {
     const db = await getDB();
     if (url.includes('/srs')) return { data: {} }; // Tạm thời bỏ qua SRS thuật toán phức tạp ở bản Offline
     
     if (url.startsWith('/vocabularies/')) {
        const id = parseInt(url.split('/')[2]);
        const vIndex = db.vocabularies.findIndex(v => v.id === id);
        if(vIndex > -1) { db.vocabularies[vIndex] = { ...db.vocabularies[vIndex], ...data }; await saveDB(db); return { data: db.vocabularies[vIndex] }; }
     }
     
     if (url.startsWith('/kanji/')) {
        const id = parseInt(url.split('/').pop());
        const kIndex = db.kanjis.findIndex(k => k.id === id);
        if(kIndex > -1) { db.kanjis[kIndex] = { ...db.kanjis[kIndex], ...data }; await saveDB(db); return { data: db.kanjis[kIndex] }; }
     }

     if (url.startsWith('/exams/')) {
        const id = parseInt(url.split('/').pop());
        const eIndex = db.exams.findIndex(e => e.id === id);
        if (eIndex > -1) {
           db.exams[eIndex].title = data.title;
           db.exams[eIndex].questions = [];
           if (data.raw_text) {
               data.raw_text.trim().split('\n').forEach((line, idx) => {
                  const parts = line.split('|').map(p => p.trim());
                  if(parts.length === 6) db.exams[eIndex].questions.push({ id: generateId() + idx, question: parts[0], options: [parts[1], parts[2], parts[3], parts[4]], correct_ans: parseInt(parts[5]) });
               });
           }
           await saveDB(db); return { data: { message: "Cập nhật đề thi thành công" } };
        }
     }
     return { data: {} };
  },
  
  delete: async (url) => {
     const db = await getDB();
     
     if (url.startsWith('/sets/')) {
        const id = parseInt(url.split('/').pop());
        db.sets = db.sets.filter(s => s.id !== id);
        db.vocabularies = db.vocabularies.filter(v => v.set_id !== id);
     }
     else if (url.startsWith('/vocabularies/')) db.vocabularies = db.vocabularies.filter(v => v.id !== parseInt(url.split('/').pop()));
     else if (url.startsWith('/kanji-sets/')) {
        const id = parseInt(url.split('/').pop());
        db.kanjiSets = db.kanjiSets.filter(s => s.id !== id);
        db.kanjis = db.kanjis.filter(k => k.kanji_set_id !== id);
     }
     else if (url.startsWith('/kanji/')) db.kanjis = db.kanjis.filter(k => k.id !== parseInt(url.split('/').pop()));
     else if (url.startsWith('/exams/')) db.exams = db.exams.filter(e => e.id !== parseInt(url.split('/').pop()));
     else if (url === '/test-history/all') db.testHistories = [];
     
     await saveDB(db); return { data: { message: "Đã xóa thành công" } };
  }
};

export default api;