import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="hero">
            <h1 className="hero-title">MeekCat</h1>
            <p className="hero-subtitle">
                A lightweight project &amp; task tracker — a kanban board plus a roadmap view.
                Auto-deployed via GitHub Actions.
            </p>
            <Link to="/board" className="btn-cta">Open the board</Link>
        </div>
    );
}