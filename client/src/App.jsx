import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import RoadmapPage from './pages/RoadmapPage.jsx';

export default function App() {
    return (
        <div className="app">
            <nav className="nav">
                <Link to="/" className="brand">MeekCat</Link>
                <div className="nav-links">
                    <Link to="/board">Board</Link>
                    <Link to="/roadmap">Roadmap</Link>
                </div>
            </nav>
            <main>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/board" element={<BoardPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                </Routes>
            </main>
        </div>
    );
}