// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Roadmap page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/roadmap');
    });

    test('renders the timeline with seeded data', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
        // a quarter axis label
        await expect(page.getByText('Q1', { exact: true })).toBeVisible();
        // a seeded bar (exact:true avoids matching the "Vision approved" milestone)
        await expect(page.getByText('Vision', { exact: true })).toBeVisible();
        // the today marker we added — note: depends on the system clock being inside the 2026 domain
        await expect(page.getByText('Today', { exact: true })).toBeVisible();
    });

    test('can add a task and see it on the chart', async ({ page }) => {
        await page.getByLabel('Task title').fill('E2E Roadmap Task');
        await page.getByLabel('Category').selectOption('strategy');
        await page.getByLabel('Start date').fill('2026-02-01');
        await page.getByLabel('End date').fill('2026-05-01');
        await page.getByLabel('Percent complete').fill('50');
        await page.getByRole('button', { name: 'Add task' }).click();

        await expect(page.getByText('E2E Roadmap Task', { exact: true })).toBeVisible();
    });

    test('overlapping tasks stack on separate rows', async ({ page }) => {
        // two tasks in the default (Planning) lane whose dates overlap Mar–Jun
        await page.getByLabel('Task title').fill('Overlap A');
        await page.getByLabel('Start date').fill('2026-01-15');
        await page.getByLabel('End date').fill('2026-06-15');
        await page.getByRole('button', { name: 'Add task' }).click();

        await page.getByLabel('Task title').fill('Overlap B');
        await page.getByLabel('Start date').fill('2026-03-01');
        await page.getByLabel('End date').fill('2026-09-01');
        await page.getByRole('button', { name: 'Add task' }).click();

        const a = await page.getByText('Overlap A', { exact: true }).boundingBox();
        const b = await page.getByText('Overlap B', { exact: true }).boundingBox();
        if (!a || !b) throw new Error('expected both bars to be on the page');
        // different sub-rows => clearly different vertical positions (ROW_STRIDE is 2.5rem ≈ 40px)
        expect(Math.abs(a.y - b.y)).toBeGreaterThan(10);
    });
});