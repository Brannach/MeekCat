// @ts-check
import { test, expect } from '@playwright/test';

test.describe('API', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('/api/test/reset');
    });

    // --- Misc -----------------------------------------------------------------

    test('GET /api/health returns ok', async ({ request }) => {
        const res = await request.get('/api/health');
        expect(res.status()).toBe(200);
        expect(await res.json()).toEqual({ status: 'ok' });
    });

    test('GET /api/hello returns expected shape', async ({ request }) => {
        const res = await request.get('/api/hello');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.message).toBe('Hello, World!');
        expect(body.from).toBe('Node.js + Express backend');
        expect(typeof body.timestamp).toBe('string');
    });

    // --- Board tasks ----------------------------------------------------------

    test('GET /api/board/tasks returns empty array on reset', async ({ request }) => {
        const res = await request.get('/api/board/tasks');
        expect(res.status()).toBe(200);
        expect(await res.json()).toEqual([]);
    });

    test('POST /api/board/tasks creates a task', async ({ request }) => {
        const res = await request.post('/api/board/tasks', {
            data: { title: 'API Task', priority: 'high' },
        });
        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body.title).toBe('API Task');
        expect(body.priority).toBe('high');
        expect(body.status).toBe('todo');
        expect(typeof body.id).toBe('number');
    });

    test('POST /api/board/tasks defaults priority to medium', async ({ request }) => {
        const res = await request.post('/api/board/tasks', { data: { title: 'Default Priority' } });
        expect(res.status()).toBe(201);
        expect((await res.json()).priority).toBe('medium');
    });

    test('POST /api/board/tasks returns 400 when title is missing', async ({ request }) => {
        const res = await request.post('/api/board/tasks', { data: { priority: 'low' } });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('title is required');
    });

    test('POST /api/board/tasks returns 400 for invalid priority', async ({ request }) => {
        const res = await request.post('/api/board/tasks', { data: { title: 'Bad Priority', priority: 'urgent' } });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('invalid priority');
    });

    test('PATCH /api/board/tasks/:id updates a task', async ({ request }) => {
        const created = await (await request.post('/api/board/tasks', { data: { title: 'Original' } })).json();

        const res = await request.patch(`/api/board/tasks/${created.id}`, {
            data: { title: 'Updated', status: 'in-progress', priority: 'low' },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.title).toBe('Updated');
        expect(body.status).toBe('in-progress');
        expect(body.priority).toBe('low');
    });

    test('PATCH /api/board/tasks/:id returns 404 for unknown id', async ({ request }) => {
        const res = await request.patch('/api/board/tasks/99999', { data: { status: 'done' } });
        expect(res.status()).toBe(404);
    });

    test('PATCH /api/board/tasks/:id returns 400 for invalid status', async ({ request }) => {
        const created = await (await request.post('/api/board/tasks', { data: { title: 'Task' } })).json();
        const res = await request.patch(`/api/board/tasks/${created.id}`, { data: { status: 'invalid' } });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('invalid status');
    });

    test('DELETE /api/board/tasks/:id deletes a task', async ({ request }) => {
        const created = await (await request.post('/api/board/tasks', { data: { title: 'To Delete' } })).json();

        const res = await request.delete(`/api/board/tasks/${created.id}`);
        expect(res.status()).toBe(204);

        const list = await (await request.get('/api/board/tasks')).json();
        expect(list.find(t => t.id === created.id)).toBeUndefined();
    });

    test('DELETE /api/board/tasks/:id returns 404 for unknown id', async ({ request }) => {
        const res = await request.delete('/api/board/tasks/99999');
        expect(res.status()).toBe(404);
    });

    // --- Roadmap items --------------------------------------------------------

    test('GET /api/roadmap/items returns empty array on reset', async ({ request }) => {
        const res = await request.get('/api/roadmap/items');
        expect(res.status()).toBe(200);
        expect(await res.json()).toEqual([]);
    });

    test('POST /api/roadmap/items creates an item', async ({ request }) => {
        const res = await request.post('/api/roadmap/items', {
            data: { category: 'dev', title: 'API Item', start: '2026-01-01', end: '2026-03-31', percent: 50 },
        });
        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body.title).toBe('API Item');
        expect(body.category).toBe('dev');
        expect(body.percent).toBe(50);
        expect(typeof body.id).toBe('number');
    });

    test('POST /api/roadmap/items returns 400 when title is missing', async ({ request }) => {
        const res = await request.post('/api/roadmap/items', {
            data: { category: 'dev', start: '2026-01-01', end: '2026-03-31' },
        });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('title is required');
    });

    test('POST /api/roadmap/items returns 400 for invalid category', async ({ request }) => {
        const res = await request.post('/api/roadmap/items', {
            data: { category: 'unknown', title: 'Item', start: '2026-01-01', end: '2026-03-31' },
        });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('invalid category');
    });

    test('POST /api/roadmap/items returns 400 when end is before start', async ({ request }) => {
        const res = await request.post('/api/roadmap/items', {
            data: { category: 'dev', title: 'Item', start: '2026-06-01', end: '2026-01-01' },
        });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('end must be on or after start');
    });

    // --- Roadmap milestones ---------------------------------------------------

    test('GET /api/roadmap/milestones returns an array', async ({ request }) => {
        const res = await request.get('/api/roadmap/milestones');
        expect(res.status()).toBe(200);
        expect(Array.isArray(await res.json())).toBe(true);
    });
});