// @ts-check
import { test, expect } from '@playwright/test';

test('homepage shows Hello World', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'meekcat' })).toBeVisible();
});
