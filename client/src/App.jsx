import { useEffect, useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Loading…');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setMessage(data.message))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container">
      <h1>Hello World</h1>
      <p data-testid="api-message" className="message">
        {error ? `Error: ${error}` : message}
      </p>
      <p className="hint">React frontend talking to a Node.js + Express backend.</p>
    </main>
  );
}
