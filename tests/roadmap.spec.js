// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Roadmap page', () => {
    test.beforeEach(async ({ page, request }) => {
        await request.post('/api/test/reset');
        await page.goto('/roadmap');
    });

    test('renders the timeline header', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
        await expect(page.getByText('Q1', { exact: true })).toBeVisible();
        // Depends on the system clock being inside the 2026 domain
        await expect(page.getByText('Today', { exact: true })).toBeVisible();
    });

    test('renders items that already exist in the DB', async ({ page, request }) => {
        await request.post('/api/roadmap/items', {
            data: { category: 'planning', title: 'Pre-existing item', start: '2026-02-01', end: '2026-05-01', percent: 50 },
        });
        await page.reload();
        await expect(page.getByText('Pre-existing item', { exact: true })).toBeVisible();
    });

    test('can add a task via the form', async ({ page }) => {
        await page.getByLabel('Task title').fill('E2E Roadmap Task');
        await page.getByLabel('Category').selectOption('strategy');
        await page.getByLabel('Start date').fill('2026-02-01');
        await page.getByLabel('End date').fill('2026-05-01');
        await page.getByLabel('Percent complete').fill('50');
        await page.getByRole('button', { name: 'Add task' }).click();

        await expect(page.getByText('E2E Roadmap Task', { exact: true })).toBeVisible();
    });

    test('overlapping tasks stack on separate rows', async ({ page, request }) => {
        await request.post('/api/roadmap/items', {
            data: { category: 'planning', title: 'Overlap A', start: '2026-01-15', end: '2026-06-15', percent: 0 },
        });
        await request.post('/api/roadmap/items', {
            data: { category: 'planning', title: 'Overlap B', start: '2026-03-01', end: '2026-09-01', percent: 0 },
        });
        await page.reload();

        const a = await page.getByText('Overlap A', { exact: true }).boundingBox();
        const b = await page.getByText('Overlap B', { exact: true }).boundingBox();
        if (!a || !b) throw new Error('expected both bars to be on the page');
        expect(Math.abs(a.y - b.y)).toBeGreaterThan(10);
    });

    test('persists items across reload', async ({ page }) => {
        await page.getByLabel('Task title').fill('Persistent roadmap task');
        await page.getByLabel('Start date').fill('2026-03-01');
        await page.getByLabel('End date').fill('2026-04-01');
        await page.getByRole('button', { name: 'Add task' }).click();

        await page.reload();
        await expect(page.getByText('Persistent roadmap task', { exact: true })).toBeVisible();
    });
});