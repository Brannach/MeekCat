const express = require('express');
const path = require('path');
const { db, init, resetAll, seedIfEmpty } = require('./db');
const { STATUSES, PRIORITIES, CATEGORIES, DEFAULT_STATUS, DEFAULT_PRIORITY } = require('./constants');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Wrap an async route handler so its rejection flows into Express's error pipeline.
const a = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Misc -------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello, World!',
    from: 'Node.js + Express backend',
    timestamp: new Date().toISOString(),
  });
});

// --- Board ------------------------------------------------------------------
app.get('/api/board/tasks', a(async (req, res) => {
  const r = await db.execute('SELECT id, title, status, priority FROM board_tasks ORDER BY id');
  res.json(r.rows);
}));

app.post('/api/board/tasks', a(async (req, res) => {
  const { title, priority = DEFAULT_PRIORITY } = req.body || {};
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return res.status(400).json({ error: 'title is required' });
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'invalid priority' });

  const insert = await db.execute({
    sql: 'INSERT INTO board_tasks (title, status, priority) VALUES (?, ?, ?)',
    args: [trimmed, DEFAULT_STATUS, priority],
  });
  const id = Number(insert.lastInsertRowid);
  const task = await db.execute({
    sql: 'SELECT id, title, status, priority FROM board_tasks WHERE id = ?',
    args: [id],
  });
  res.status(201).json(task.rows[0]);
}));

app.patch('/api/board/tasks/:id', a(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

  const existing = (await db.execute({ sql: 'SELECT * FROM board_tasks WHERE id = ?', args: [id] })).rows[0];
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
  await db.execute({
    sql: 'UPDATE board_tasks SET title = ?, status = ?, priority = ? WHERE id = ?',
    args: [next.title, next.status, next.priority, id],
  });
  const updated = await db.execute({
    sql: 'SELECT id, title, status, priority FROM board_tasks WHERE id = ?',
    args: [id],
  });
  res.json(updated.rows[0]);
}));

app.delete('/api/board/tasks/:id', a(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });

  const del = await db.execute({ sql: 'DELETE FROM board_tasks WHERE id = ?', args: [id] });
  if (Number(del.rowsAffected) === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
}));

// --- Roadmap ----------------------------------------------------------------
const isIsoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

app.get('/api/roadmap/items', a(async (req, res) => {
  const r = await db.execute(
      'SELECT id, category, title, start_date AS start, end_date AS end, percent FROM roadmap_items ORDER BY id'
  );
  res.json(r.rows);
}));

app.post('/api/roadmap/items', a(async (req, res) => {
  const { category, title, start, end, percent = 0 } = req.body || {};
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!CATEGORIES.includes(category))      return res.status(400).json({ error: 'invalid category' });
  if (!trimmed)                            return res.status(400).json({ error: 'title is required' });
  if (!isIsoDate(start) || !isIsoDate(end))return res.status(400).json({ error: 'start/end must be YYYY-MM-DD' });
  if (end < start)                         return res.status(400).json({ error: 'end must be on or after start' });
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));

  const insert = await db.execute({
    sql: 'INSERT INTO roadmap_items (category, title, start_date, end_date, percent) VALUES (?, ?, ?, ?, ?)',
    args: [category, trimmed, start, end, pct],
  });
  const id = Number(insert.lastInsertRowid);
  const item = await db.execute({
    sql: 'SELECT id, category, title, start_date AS start, end_date AS end, percent FROM roadmap_items WHERE id = ?',
    args: [id],
  });
  res.status(201).json(item.rows[0]);
}));

app.get('/api/roadmap/milestones', a(async (req, res) => {
  const r = await db.execute('SELECT id, category, title, date FROM roadmap_milestones ORDER BY id');
  res.json(r.rows);
}));

// Test-only: wipe all data. Disabled in production.
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test/reset', a(async (req, res) => {
    await resetAll();
    res.status(204).end();
  }));
}

// Serve the built React app from client/dist
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler: any thrown promise in a handler ends up here.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal server error' });
});

// Async startup: schema first, optional seed, then bind the port.
(async () => {
  try {
    await init();
    if (process.env.SEED_DB === 'true') {
      await seedIfEmpty();
    }
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

module.exports = { STATUSES, PRIORITIES, CATEGORIES };
module.exports = app;