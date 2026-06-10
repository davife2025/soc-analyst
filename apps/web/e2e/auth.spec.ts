import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('SOC Analyst')).toBeVisible()
    await expect(page.getByText('Autonomous Security Operations')).toBeVisible()
    await expect(page.getByPlaceholder('analyst@company.com')).toBeVisible()
  })

  test('login page shows password and magic link tabs', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Magic Link' })).toBeVisible()
  })

  test('magic link tab switches form', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Magic Link' }).click()
    await expect(page.getByRole('button', { name: 'Send Magic Link' })).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).not.toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'bad@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('.error')).toBeVisible({ timeout: 8000 })
  })
})
