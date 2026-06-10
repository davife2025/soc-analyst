import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) { test.skip(); return }
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Playbooks', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('shows default playbooks', async ({ page }) => {
    await page.goto('/playbooks')
    await expect(page.getByText('Critical Alert Auto-Notify')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('High Confidence Threat Response')).toBeVisible()
    await expect(page.getByText('Lateral Movement Containment')).toBeVisible()
  })

  test('shows playbook step count', async ({ page }) => {
    await page.goto('/playbooks')
    const stepCounts = page.getByText(/\d+ steps/)
    await expect(stepCounts.first()).toBeVisible()
  })

  test('shows trigger conditions', async ({ page }) => {
    await page.goto('/playbooks')
    await expect(page.getByText('severity').first()).toBeVisible()
  })
})
