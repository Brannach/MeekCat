// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Hello World app', () => {
  test('renders the heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  });

  test('fetches and displays the API message', async ({ page }) => {
    await page.goto('/');
    const message = page.getByTestId('api-message');
    await expect(message).toHaveText('Hello, World!', { timeout: 10_000 });
  });

  test('API endpoint returns JSON greeting', async ({ request }) => {
    const res = await request.get('/api/hello');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe('Hello, World!');
    expect(body.from).toContain('Node.js');
  });

  test('health endpoint responds OK', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
