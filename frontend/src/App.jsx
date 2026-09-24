import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { AnimatePresence, motion } from "framer-motion";
import 'react-toastify/dist/ReactToastify.css';

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import FlashcardMode from "./components/FlashcardMode";
import LearnMode from "./components/LearnMode";
import TestMode from "./components/TestMode";
import MatchMode from "./components/MatchMode";
import ExamMode from './components/ExamMode';
import KanjiDictionary from "./pages/KanjiDictionary"; 
import NotFound from "./pages/NotFound";
import { VocabProvider } from "./context/VocabContext";

// Component bọc từng trang để tạo hiệu ứng
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Component xử lý hiệu ứng khi đổi Route
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/flashcards" element={<PageWrapper><FlashcardMode /></PageWrapper>} />
        <Route path="/learn" element={<PageWrapper><LearnMode /></PageWrapper>} />
        <Route path="/test" element={<PageWrapper><TestMode /></PageWrapper>} />
        <Route path="/match" element={<PageWrapper><MatchMode /></PageWrapper>} />
        <Route path="/exam" element={<PageWrapper><ExamMode /></PageWrapper>} />
        <Route path="/kanji" element={<PageWrapper><KanjiDictionary /></PageWrapper>} /> 
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    // Tự động dọn dẹp dữ liệu lịch sử Test cũ không còn sử dụng ở localStorage
    localStorage.removeItem("scofieldTestHistory");
  }, []);

  return (
    <VocabProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <div className="container-fluid py-4" style={{ maxWidth: '1200px' }}>
              <AnimatedRoutes />
            </div>
          </main>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      </BrowserRouter>
    </VocabProvider>
  );
}

export default App;