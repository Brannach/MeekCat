import { useState, useEffect } from 'react';

const STATUSES = [
    { key: 'todo', label: 'To Do' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
];

export default function BoardPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');

    useEffect(() => {
        fetch('/api/board/tasks')
            .then(r => r.json())
            .then(data => { setTasks(data); setLoading(false); })
            .catch(err => { console.error('Failed to load tasks', err); setLoading(false); });
    }, []);

    async function addTask(e) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        const res = await fetch('/api/board/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: trimmed, priority }),
        });
        if (!res.ok) { console.error('Add failed', await res.text()); return; }
        const created = await res.json();
        setTasks(prev => [...prev, created]);
        setTitle('');
        setPriority('medium');
    }

    async function moveTask(id, direction) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const order = STATUSES.map(s => s.key);
        const i = order.indexOf(task.status);
        const nextStatus = order[Math.min(Math.max(i + direction, 0), order.length - 1)];
        if (nextStatus === task.status) return; // already at an edge — nothing to do

        const res = await fetch(`/api/board/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) { console.error('Move failed', await res.text()); return; }
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
    }

    async function deleteTask(id) {
        const res = await fetch(`/api/board/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) { console.error('Delete failed', await res.text()); return; }
        setTasks(prev => prev.filter(t => t.id !== id));
    }
    
    return (
        <div>
            <h1 className="page-title">Board</h1>

            <form onSubmit={addTask} className="form-row">
                <input
                    aria-label="Task title"
                    placeholder="New task title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="input"
                />
                <select aria-label="Priority" value={priority} onChange={e => setPriority(e.target.value)} className="select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <button type="submit" className="btn-primary">Add task</button>
            </form>

            <div className="board">
                {STATUSES.map((col, colIndex) => {
                    const columnTasks = tasks.filter(task => task.status === col.key);
                    return (
                        <section key={col.key} aria-label={col.label} className="column">
                            <h2 className="column-title">
                                {col.label}
                                <span className="column-count">{columnTasks.length}</span>
                            </h2>
                            <ul className="card-list">
                                {columnTasks.map(task => (
                                    <li key={task.id} className={`card border-priority-${task.priority}`}>
                                        <div className="card-header">
                                            <span className="card-title">{task.title}</span>
                                            <span className={`badge badge-priority-${task.priority}`}>{task.priority}</span>
                                        </div>
                                        <div className="card-actions">
                                            <button onClick={() => moveTask(task.id, -1)} disabled={colIndex === 0}
                                                    aria-label={`Move "${task.title}" left`} className="btn-icon">◀</button>
                                            <button onClick={() => moveTask(task.id, 1)} disabled={colIndex === STATUSES.length - 1}
                                                    aria-label={`Move "${task.title}" right`} className="btn-icon">▶</button>
                                            <button onClick={() => deleteTask(task.id)}
                                                    aria-label={`Delete "${task.title}"`} className="btn-icon-danger">✕</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}