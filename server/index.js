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

const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

// Board: create
app.post('/api/board/tasks', (req, res) => {
  const { title, priority = 'medium' } = req.body || {};
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'title is required' });
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'invalid priority' });

  const info = db
      .prepare('INSERT INTO board_tasks (title, status, priority) VALUES (?, ?, ?)')
      .run(trimmed, 'todo', priority);
  const task = db
      .prepare('SELECT id, title, status, priority FROM board_tasks WHERE id = ?')
      .get(info.lastInsertRowid);
  res.status(201).json(task);
});

// Board: update (any subset of title/status/priority)
app.patch('/api/board/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

  const existing = db.prepare('SELECT * FROM board_tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const { title, status, priority } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'invalid priority' });
  }

  const next = {
    title:    title    !== undefined ? title.trim() : existing.title,
    status:   status   !== undefined ? status       : existing.status,
    priority: priority !== undefined ? priority     : existing.priority,
  };
  db.prepare('UPDATE board_tasks SET title = ?, status = ?, priority = ? WHERE id = ?')
      .run(next.title, next.status, next.priority, id);

  const updated = db
      .prepare('SELECT id, title, status, priority FROM board_tasks WHERE id = ?')
      .get(id);
  res.json(updated);
});

// Board: delete
app.delete('/api/board/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

  const info = db.prepare('DELETE FROM board_tasks WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

const CATEGORIES = ['planning', 'strategy', 'dev', 'bi'];
const isIsoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Roadmap: list items
app.get('/api/roadmap/items', (req, res) => {
  const items = db
      .prepare('SELECT id, category, title, start_date AS start, end_date AS end, percent FROM roadmap_items ORDER BY id')
      .all();
  res.json(items);
});

// Roadmap: create item
app.post('/api/roadmap/items', (req, res) => {
  const { category, title, start, end, percent = 0 } = req.body || {};
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!CATEGORIES.includes(category))            return res.status(400).json({ error: 'invalid category' });
  if (!trimmed)                                  return res.status(400).json({ error: 'title is required' });
  if (!isIsoDate(start) || !isIsoDate(end))      return res.status(400).json({ error: 'start/end must be YYYY-MM-DD' });
  if (end < start)                               return res.status(400).json({ error: 'end must be on or after start' });
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));

  const info = db
      .prepare('INSERT INTO roadmap_items (category, title, start_date, end_date, percent) VALUES (?, ?, ?, ?, ?)')
      .run(category, trimmed, start, end, pct);
  const item = db
      .prepare('SELECT id, category, title, start_date AS start, end_date AS end, percent FROM roadmap_items WHERE id = ?')
      .get(info.lastInsertRowid);
  res.status(201).json(item);
});

// Roadmap: list milestones (read-only for now — UI doesn't add/delete them)
app.get('/api/roadmap/milestones', (req, res) => {
  const milestones = db
      .prepare('SELECT id, category, title, date FROM roadmap_milestones ORDER BY id')
      .all();
  res.json(milestones);
});

module.exports = app;
