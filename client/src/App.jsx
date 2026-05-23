import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import RoadmapPage from './pages/RoadmapPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    function toggleTheme() {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    }

    return (
        <div className="app-shell">
            <nav className="nav">
                <Link to="/" className="nav-brand">MeekCat</Link>
                <div className="nav-links">
                    <Link to="/board" className="nav-link">Board</Link>
                    <Link to="/roadmap" className="nav-link">Roadmap</Link>
                    <Link to="/settings" className="nav-link">Settings</Link>
                </div>
            </nav>
            <main className="main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/board" element={<BoardPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                    <Route path="/settings" element={<SettingsPage theme={theme} onToggle={toggleTheme} />} />
                </Routes>
            </main>
        </div>
    );
}