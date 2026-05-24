import { useState } from 'react';

// The chart spans one calendar year; every position is a % of this window.
const DOMAIN_START = '2026-01-01';
const DOMAIN_END   = '2027-01-01';

const QUARTERS = [
    { key: 'Q1', start: '2026-01-01' },
    { key: 'Q2', start: '2026-04-01' },
    { key: 'Q3', start: '2026-07-01' },
    { key: 'Q4', start: '2026-10-01' },
];

const CATEGORIES = [
    { key: 'planning', label: 'Planning',             color: 'cat-planning' },
    { key: 'strategy', label: 'Strategy',             color: 'cat-strategy' },
    { key: 'dev',      label: 'Service Development',   color: 'cat-dev' },
    { key: 'bi',       label: 'Business Intelligence', color: 'cat-bi' },
];

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

function toPct(dateStr) {
    const span   = new Date(DOMAIN_END) - new Date(DOMAIN_START);
    const offset = new Date(dateStr)    - new Date(DOMAIN_START);
    return (offset / span) * 100;
}

export default function RoadmapPage() {
    const [items] = useState(initialItems);

    return (
        <div>
            <h1 className="page-title">Roadmap</h1>

            <div className="gantt">
                {/* time axis */}
                <div className="gantt-header">
                    <div className="lane-label-spacer" />
                    <div className="lane-track axis-track">
                        {QUARTERS.map(q => (
                            <span key={q.key} className="axis-label" style={{ left: `${toPct(q.start)}%` }}>
                {q.key}
              </span>
                        ))}
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
                            {items.filter(i => i.category === cat.key).map(item => {
                                const left = toPct(item.start);
                                const width = toPct(item.end) - left;
                                return (
                                    <div key={item.id}
                                         className={`bar ${cat.color}-bar`}
                                         style={{ left: `${left}%`, width: `${width}%` }}
                                         aria-label={`${item.title}, ${item.percent}% complete`}>
                                        <span className="bar-label">{item.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}