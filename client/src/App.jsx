import {Routes, Route, Link} from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AnimatorPage from './pages/AnimatorPage.jsx';

export default function App() {
    return (
        <div className="app">
            <nav className="nav">
                <Link to="/">Home</Link>
                <Link to="/animator">Animator</Link>
            </nav>
            <main>
                <Routes>
                    <Route path="/" element={<HomePage/>}/>
                    <Route path="/animator" element={<AnimatorPage/>}/>
                </Routes>
            </main>
        </div>
    );
}

