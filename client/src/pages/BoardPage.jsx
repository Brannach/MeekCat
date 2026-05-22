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
        <div className="container">
            <h1>Board</h1>

            <form className="add-task" onSubmit={addTask}>
                <input
                    aria-label="Task title"
                    placeholder="New task title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
                <select aria-label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <button type="submit">Add task</button>
            </form>

            <div className="board">
                {STATUSES.map((col, colIndex) => {
                    const columnTasks = tasks.filter(task => task.status === col.key);
                    return (
                        <section className="column" key={col.key} aria-label={col.label}>
                            <h2>{col.label} ({columnTasks.length})</h2>
                            <ul>
                                {columnTasks.map(task => (
                                    <li className={`card priority-${task.priority}`} key={task.id}>
                                        <span className="card-title">{task.title}</span>
                                        <span className="badge">{task.priority}</span>
                                        <div className="card-actions">
                                            <button onClick={() => moveTask(task.id, -1)} disabled={colIndex === 0}
                                                    aria-label={`Move "${task.title}" left`}>◀</button>
                                            <button onClick={() => moveTask(task.id, 1)} disabled={colIndex === STATUSES.length - 1}
                                                    aria-label={`Move "${task.title}" right`}>▶</button>
                                            <button onClick={() => deleteTask(task.id)}
                                                    aria-label={`Delete "${task.title}"`}>✕</button>
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