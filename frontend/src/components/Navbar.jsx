import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { VocabContext } from '../context/VocabContext';

function Navbar() {
  const location = useLocation();
  const { studyProgress } = useContext(VocabContext);

  const navItems = [
    { path: "/", label: "Thư viện", icon: "📚" },
    { path: "/kanji", label: "Kanji", icon: "⛩️" }, 
    { path: "/flashcards", label: "Flashcards", icon: "🗂️" },
    { path: "/learn", label: "Học", icon: "🧠" },
    { path: "/test", label: "Kiểm tra", icon: "📝" },
    { path: "/match", label: "Ghép thẻ", icon: "🎮" },
    { path: "/exam", label: "Thi trắc nghiệm", icon: "⏱️" }
  ];

  return (
    <nav className="app-navigation print-d-none">
      {/* Header Logo */}
      <Link className="nav-brand-desktop d-none d-lg-flex align-items-center mb-5 text-white text-decoration-none" to="/">
        <img src="/sea_15651557.ico" alt="Logo" width="40" height="40" className="bg-white rounded-circle p-1 shadow-sm" style={{ minWidth: '40px' }} />
        <h3 className="fw-bold mb-0 ms-3 nav-text">Scofield</h3>
      </Link>
      
      {/* Danh sách Menu */}
      <div className="nav-menu d-flex flex-lg-column flex-row w-100 justify-content-around justify-content-lg-start">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`nav-link-custom ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="d-none d-lg-block fw-bold nav-text">{item.label}</span>
              <span className="d-lg-none mobile-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      </nav>
  );
}

export default Navbar;