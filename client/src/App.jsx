import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import RoadmapPage from './pages/RoadmapPage.jsx';

export default function App() {
    return (
        <div className="app-shell">
            <nav className="nav">
                <Link to="/" className="nav-brand">MeekCat</Link>
                <div className="nav-links">
                    <Link to="/board" className="nav-link">Board</Link>
                    <Link to="/roadmap" className="nav-link">Roadmap</Link>
                </div>
            </nav>
            <main className="main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/board" element={<BoardPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                </Routes>
            </main>
        </div>
    );
}