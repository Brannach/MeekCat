// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Board page', () => {
    test.beforeEach(async ({ page, request }) => {
        await request.post('/api/test/reset');
        await page.goto('/board');
    });

    test('renders three columns', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'To Do' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'In Progress' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Done' })).toBeVisible();
    });

    test('can add a task via the form', async ({ page }) => {
        await page.getByLabel('Task title').fill('E2E Board Task');
        await page.getByLabel('Priority').selectOption('high');
        await page.getByRole('button', { name: 'Add task' }).click();

        const todo = page.getByRole('region', { name: 'To Do' });
        await expect(todo.getByText('E2E Board Task')).toBeVisible();
    });

    test('renders tasks that already exist in the DB', async ({ page, request }) => {
        await request.post('/api/board/tasks', { data: { title: 'Pre-existing task', priority: 'medium' } });
        await page.reload();

        const todo = page.getByRole('region', { name: 'To Do' });
        await expect(todo.getByText('Pre-existing task')).toBeVisible();
    });

    test('can move a task across columns', async ({ page, request }) => {
        await request.post('/api/board/tasks', { data: { title: 'Moveable', priority: 'high' } });
        await page.reload();

        const todo = page.getByRole('region', { name: 'To Do' });
        const inProgress = page.getByRole('region', { name: 'In Progress' });

        await page.getByRole('button', { name: 'Move "Moveable" right' }).click();

        await expect(inProgress.getByText('Moveable')).toBeVisible();
        await expect(todo.getByText('Moveable')).toHaveCount(0);
    });

    test('can delete a task', async ({ page, request }) => {
        await request.post('/api/board/tasks', { data: { title: 'Disposable', priority: 'medium' } });
        await page.reload();

        await page.getByRole('button', { name: 'Delete "Disposable"' }).click();
        await expect(page.getByText('Disposable')).toHaveCount(0);
    });

    test('persists tasks across reload', async ({ page }) => {
        await page.getByLabel('Task title').fill('Persistent task');
        await page.getByRole('button', { name: 'Add task' }).click();

        await page.reload();
        await expect(page.getByRole('region', { name: 'To Do' }).getByText('Persistent task')).toBeVisible();
    });
});