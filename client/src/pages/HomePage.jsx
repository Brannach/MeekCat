import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="container home">
            <h1>MeekCat</h1>
            <p>A lightweight project &amp; task tracker — a kanban board plus a roadmap view.</p>
            <Link to="/board" className="cta">Open the board</Link>
        </div>
    );
}