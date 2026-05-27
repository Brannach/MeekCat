const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const DEFAULT_LOCAL = path.join(__dirname, 'data', 'meekcat.db');
const url = process.env.DATABASE_URL || pathToFileURL(DEFAULT_LOCAL).href;
const authToken = process.env.DATABASE_AUTH_TOKEN; // unused for file: / :memory:

if (url.startsWith('file:')) {
    fs.mkdirSync(path.dirname(DEFAULT_LOCAL), { recursive: true });
}

const db = createClient({ url, authToken });

// --- Schema ------------------------------------------------------------------
async function init() {
    await db.batch([
        `CREATE TABLE IF NOT EXISTS board_tasks (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       title      TEXT    NOT NULL,
       status     TEXT    NOT NULL,
       priority   TEXT    NOT NULL,
       created_at TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
        `CREATE TABLE IF NOT EXISTS roadmap_items (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       category   TEXT    NOT NULL,
       title      TEXT    NOT NULL,
       start_date TEXT    NOT NULL,
       end_date   TEXT    NOT NULL,
       percent    INTEGER NOT NULL DEFAULT 0,
       created_at TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
        `CREATE TABLE IF NOT EXISTS roadmap_milestones (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       category   TEXT    NOT NULL,
       title      TEXT    NOT NULL,
       date       TEXT    NOT NULL,
       created_at TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
    ]);
}

// --- Seed data ---------------------------------------------------------------
const initialBoardTasks = [
    { title: 'Set up the project board',          status: 'done',        priority: 'high'   },
    { title: 'Design the task card',              status: 'in-progress', priority: 'medium' },
    { title: 'Write the first Playwright test',   status: 'todo',        priority: 'high'   },
];

const initialRoadmapItems = [
    { category: 'planning', title: 'Vision',              start: '2026-01-02', end: '2026-03-31', percent: 100 },
    { category: 'planning', title: 'Strategic Intent',    start: '2026-04-07', end: '2026-06-30', percent: 100 },
    { category: 'planning', title: 'Beta + Release Plans',start: '2026-08-01', end: '2026-12-01', percent: 40  },
    { category: 'strategy', title: 'Market Analysis',     start: '2026-02-01', end: '2026-04-15', percent: 100 },
    { category: 'strategy', title: 'Business Model',      start: '2026-04-15', end: '2026-06-30', percent: 80  },
    { category: 'strategy', title: 'Objectives',          start: '2026-08-01', end: '2026-10-15', percent: 0   },
    { category: 'dev',      title: 'Product Roadmap',     start: '2026-01-10', end: '2026-02-20', percent: 100 },
    { category: 'dev',      title: 'Development',         start: '2026-03-01', end: '2026-08-10', percent: 75  },
    { category: 'dev',      title: 'Release to Web',      start: '2026-11-15', end: '2026-12-20', percent: 0   },
    { category: 'bi',       title: 'Service Metrics',     start: '2026-03-01', end: '2026-05-15', percent: 100 },
    { category: 'bi',       title: 'Real-Time Analytics', start: '2026-09-01', end: '2026-12-15', percent: 0   },
];

const initialMilestones = [
    { category: 'planning', title: 'Vision approved',  date: '2026-02-15' },
    { category: 'strategy', title: 'SWOT complete',    date: '2026-03-20' },
    { category: 'strategy', title: 'Final Price List', date: '2026-07-15' },
    { category: 'dev',      title: 'Alpha',            date: '2026-05-20' },
    { category: 'dev',      title: 'Public Beta',      date: '2026-08-10' },
    { category: 'dev',      title: 'Go Live!',         date: '2026-12-20' },
];

async function seedIfEmpty() {
    const boardCount = Number((await db.execute('SELECT COUNT(*) AS n FROM board_tasks')).rows[0].n);
    if (boardCount === 0) {
        for (const t of initialBoardTasks) {
            await db.execute({
                sql: 'INSERT INTO board_tasks (title, status, priority) VALUES (?, ?, ?)',
                args: [t.title, t.status, t.priority],
            });
        }
    }
    const itemCount = Number((await db.execute('SELECT COUNT(*) AS n FROM roadmap_items')).rows[0].n);
    if (itemCount === 0) {
        for (const i of initialRoadmapItems) {
            await db.execute({
                sql: 'INSERT INTO roadmap_items (category, title, start_date, end_date, percent) VALUES (?, ?, ?, ?, ?)',
                args: [i.category, i.title, i.start, i.end, i.percent],
            });
        }
    }
    const msCount = Number((await db.execute('SELECT COUNT(*) AS n FROM roadmap_milestones')).rows[0].n);
    if (msCount === 0) {
        for (const m of initialMilestones) {
            await db.execute({
                sql: 'INSERT INTO roadmap_milestones (category, title, date) VALUES (?, ?, ?)',
                args: [m.category, m.title, m.date],
            });
        }
    }
}

async function resetAll() {
    await db.batch([
        'DELETE FROM board_tasks',
        'DELETE FROM roadmap_items',
        'DELETE FROM roadmap_milestones',
    ]);
}

module.exports = { db, init, seedIfEmpty, resetAll };