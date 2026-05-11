const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// API route
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello, World!',
    from: 'Node.js + Express backend',
    timestamp: new Date().toISOString(),
  });
});

// Health check route (handy for cloud deploys)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve the built React app from client/dist
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback — anything not /api/* serves index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
