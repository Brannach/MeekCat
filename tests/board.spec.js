// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Board page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/board');
    });

    test('renders three columns with seeded cards', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible();

        const todo = page.getByRole('region', { name: 'To Do' });
        const inProgress = page.getByRole('region', { name: 'In Progress' });
        const done = page.getByRole('region', { name: 'Done' });

        await expect(todo.getByText('Write the first Playwright test')).toBeVisible();
        await expect(inProgress.getByText('Design the task card')).toBeVisible();
        await expect(done.getByText('Set up the project board')).toBeVisible();
    });

    test('can add a task to To Do', async ({ page }) => {
        await page.getByLabel('Task title').fill('E2E Board Task');
        await page.getByLabel('Priority').selectOption('high');
        await page.getByRole('button', { name: 'Add task' }).click();

        const todo = page.getByRole('region', { name: 'To Do' });
        await expect(todo.getByText('E2E Board Task')).toBeVisible();
    });

    test('can move a task across columns', async ({ page }) => {
        const todo = page.getByRole('region', { name: 'To Do' });
        const inProgress = page.getByRole('region', { name: 'In Progress' });

        await page.getByRole('button', { name: 'Move "Write the first Playwright test" right' }).click();

        await expect(inProgress.getByText('Write the first Playwright test')).toBeVisible();
        await expect(todo.getByText('Write the first Playwright test')).toHaveCount(0);
    });

    test('can delete a task', async ({ page }) => {
        await page.getByRole('button', { name: 'Delete "Design the task card"' }).click();
        await expect(page.getByText('Design the task card')).toHaveCount(0);
    });
});