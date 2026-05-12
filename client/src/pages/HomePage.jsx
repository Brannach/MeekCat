import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="container">
            <h1>MeekCat</h1>
            <p>A sprite sheet animator for 2D game assets.</p>
            <Link to="/animator" className="cta">Open the animator →</Link>
        </div>
    );
}