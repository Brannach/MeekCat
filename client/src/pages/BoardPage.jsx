import { useState } from 'react';

const STATUSES = [
    { key: 'todo', label: 'To Do' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
];

let nextId = 4;

const initialTasks = [
    { id: 1, title: 'Set up the project board', status: 'done', priority: 'high' },
    { id: 2, title: 'Design the task card', status: 'in-progress', priority: 'medium' },
    { id: 3, title: 'Write the first Playwright test', status: 'todo', priority: 'high' },
];

export default function BoardPage() {
    const [tasks, setTasks] = useState(initialTasks);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');

    function addTask(e) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        setTasks(prev => [...prev, { id: nextId++, title: trimmed, status: 'todo', priority }]);
        setTitle('');
        setPriority('medium');
    }

    function moveTask(id, direction) {
        setTasks(prev =>
            prev.map(task => {
                if (task.id !== id) return task;
                const order = STATUSES.map(s => s.key);
                const i = order.indexOf(task.status);
                const next = Math.min(Math.max(i + direction, 0), order.length - 1);
                return { ...task, status: order[next] };
            })
        );
    }

    function deleteTask(id) {
        setTasks(prev => prev.filter(task => task.id !== id));
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