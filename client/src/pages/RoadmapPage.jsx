import { useState } from 'react';

const DOMAIN_START = '2026-01-01';
const DOMAIN_END   = '2027-01-01';

const QUARTERS = [
    { key: 'Q1', start: '2026-01-01' },
    { key: 'Q2', start: '2026-04-01' },
    { key: 'Q3', start: '2026-07-01' },
    { key: 'Q4', start: '2026-10-01' },
];

const REVIEWS = [
    { key: 'r1', label: 'Q1 Review', date: '2026-03-31' },
    { key: 'r2', label: 'Q2 Review', date: '2026-06-30' },
    { key: 'r3', label: 'Q3 Review', date: '2026-09-30' },
    { key: 'r4', label: 'Q4 Review', date: '2026-12-20' },
];

const CATEGORIES = [
    { key: 'planning', label: 'Planning',             color: 'cat-planning' },
    { key: 'strategy', label: 'Strategy',             color: 'cat-strategy' },
    { key: 'dev',      label: 'Service Development',   color: 'cat-dev' },
    { key: 'bi',       label: 'Business Intelligence', color: 'cat-bi' },
];

let nextItemId = 12;

const initialItems = [
    { id: 1,  category: 'planning', title: 'Vision',              start: '2026-01-02', end: '2026-03-31', percent: 100 },
    { id: 2,  category: 'planning', title: 'Strategic Intent',    start: '2026-04-07', end: '2026-06-30', percent: 100 },
    { id: 3,  category: 'planning', title: 'Beta + Release Plans',start: '2026-08-01', end: '2026-12-01', percent: 40 },
    { id: 4,  category: 'strategy', title: 'Market Analysis',     start: '2026-02-01', end: '2026-04-15', percent: 100 },
    { id: 5,  category: 'strategy', title: 'Business Model',      start: '2026-04-15', end: '2026-06-30', percent: 80 },
    { id: 6,  category: 'strategy', title: 'Objectives',          start: '2026-08-01', end: '2026-10-15', percent: 0 },
    { id: 7,  category: 'dev',      title: 'Product Roadmap',     start: '2026-01-10', end: '2026-02-20', percent: 100 },
    { id: 8,  category: 'dev',      title: 'Development',         start: '2026-03-01', end: '2026-08-10', percent: 75 },
    { id: 9,  category: 'dev',      title: 'Release to Web',      start: '2026-11-15', end: '2026-12-20', percent: 0 },
    { id: 10, category: 'bi',       title: 'Service Metrics',     start: '2026-03-01', end: '2026-05-15', percent: 100 },
    { id: 11, category: 'bi',       title: 'Real-Time Analytics', start: '2026-09-01', end: '2026-12-15', percent: 0 },
];

const initialMilestones = [
    { id: 1, category: 'planning', title: 'Vision approved',  date: '2026-02-15' },
    { id: 2, category: 'strategy', title: 'SWOT complete',    date: '2026-03-20' },
    { id: 3, category: 'strategy', title: 'Final Price List', date: '2026-07-15' },
    { id: 4, category: 'dev',      title: 'Alpha',            date: '2026-05-20' },
    { id: 5, category: 'dev',      title: 'Public Beta',      date: '2026-08-10' },
    { id: 6, category: 'dev',      title: 'Go Live!',         date: '2026-12-20' },
];

function toPct(dateStr) {
    const span   = new Date(DOMAIN_END) - new Date(DOMAIN_START);
    const offset = new Date(dateStr)    - new Date(DOMAIN_START);
    return (offset / span) * 100;
}

function formatShort(dateStr) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayISO() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RoadmapPage() {
    const [items, setItems] = useState(initialItems);
    const [milestones] = useState(initialMilestones);

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('planning');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [percent, setPercent] = useState('');

    const today = todayISO();
    const todayPct = toPct(today);
    const showToday = todayPct >= 0 && todayPct <= 100; // hide if outside the 2026 domain


    function addItem(e) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed || !start || !end) return;
        if (end < start) return; // ISO date strings (YYYY-MM-DD) compare correctly as text
        const pct = Math.min(100, Math.max(0, Number(percent) || 0)); // clamp into 0–100
        setItems(prev => [...prev, { id: nextItemId++, category, title: trimmed, start, end, percent: pct }]);
        setTitle('');
        setStart('');
        setEnd('');
        setPercent('');
        // leave the category selected, so adding several to one lane is quick
    }

    return (
        <div>
            <h1 className="page-title">Roadmap</h1>

            <form onSubmit={addItem} className="form-row">
                <input aria-label="Task title" placeholder="New task" value={title}
                       onChange={e => setTitle(e.target.value)} className="input" />
                <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)} className="select">
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input aria-label="Start date" type="date" value={start}
                       onChange={e => setStart(e.target.value)} className="select" />
                <input aria-label="End date" type="date" value={end}
                       onChange={e => setEnd(e.target.value)} className="select" />
                <input aria-label="Percent complete" type="number" min="0" max="100" placeholder="% done"
                       value={percent} onChange={e => setPercent(e.target.value)} className="select" />
                <button type="submit" className="btn-primary">Add task</button>
            </form>

            <div className="gantt">
                {/* time axis with review flags */}
                <div className="gantt-header">
                    <div className="lane-label-spacer" />
                    <div className="lane-track axis-track">
                        {QUARTERS.map(q => (
                            <span key={q.key} className="axis-label" style={{ left: `${toPct(q.start)}%` }}>
                {q.key}
              </span>
                        ))}
                        {REVIEWS.map(r => (
                            <div key={r.key} className="review" style={{ left: `${toPct(r.date)}%` }}
                                 aria-label={`${r.label}, ${formatShort(r.date)}`} title={r.label}>
                                <span className="review-label">{r.label}</span>
                                <span className="review-date">{formatShort(r.date)}</span>
                                <span className="review-flag" />
                            </div>
                        ))}
                        {showToday && (
                            <div className="today-marker" style={{ left: `${todayPct}%` }}
                                 aria-label={`Today, ${formatShort(today)}`} title={`Today — ${formatShort(today)}`}>
                                <span className="today-label">Today</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* one row per category */}
                {CATEGORIES.map(cat => (
                    <div key={cat.key} className="gantt-row">
                        <div className={`lane-label ${cat.color}`}>{cat.label}</div>
                        <div className="lane-track">
                            {QUARTERS.map(q => (
                                <div key={q.key} className="gridline" style={{ left: `${toPct(q.start)}%` }} />
                            ))}
                            {showToday && (
                                <div className="today-line" style={{ left: `${todayPct}%` }} aria-hidden="true" />
                            )}

                            {items.filter(i => i.category === cat.key).map(item => {
                                const left = toPct(item.start);
                                const width = toPct(item.end) - left;
                                return (
                                    <div key={item.id} className="bar-wrap" style={{ left: `${left}%`, width: `${width}%` }}>
                                        <div className={`bar ${cat.color}-bar`}
                                             aria-label={`${item.title}, ${item.percent}% complete, ${formatShort(item.start)} to ${formatShort(item.end)}`}>
                                            <span className="bar-label">{item.title}</span>
                                            <span className="bar-pct">{item.percent}%</span>
                                        </div>
                                        <span className="bar-caption">{formatShort(item.start)} – {formatShort(item.end)}</span>
                                    </div>
                                );
                            })}

                            {milestones.filter(m => m.category === cat.key).map(m => (
                                <div key={m.id} className="lane-milestone" style={{ left: `${toPct(m.date)}%` }}>
                                    <span className="lane-milestone-label" title={m.title}>{m.title}</span>
                                    <span className="lane-milestone-marker"
                                          aria-label={`Milestone: ${m.title}, ${formatShort(m.date)}`} title={m.title} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}