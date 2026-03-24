import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://explora-seven.vercel.app');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Explora — Explore the World Around You/);
});

test('login button is visible', async ({ page }) => {
  await page.goto('/');                     // uses baseURL from config
  const loginButton = page.getByRole('button', { name: /login/i });
  await expect(loginButton).toBeVisible();
});