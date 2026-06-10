import { test, expect, type Page } from '@playwright/test'

async function seedAndLogin(page: Page) {
  // Sign in via Supabase test credentials if set
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    test.skip()
    return
  }
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => { await seedAndLogin(page) })

  test('shows SOC Analyst header', async ({ page }) => {
    await expect(page.getByText('SOC Analyst')).toBeVisible()
  })

  test('shows nav links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Playbooks' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('shows stat counters', async ({ page }) => {
    await expect(page.getByText('Critical')).toBeVisible()
    await expect(page.getByText('New')).toBeVisible()
    await expect(page.getByText('Investigating')).toBeVisible()
    await expect(page.getByText('Resolved')).toBeVisible()
  })

  test('navigates to playbooks', async ({ page }) => {
    await page.getByRole('link', { name: 'Playbooks' }).click()
    await expect(page).toHaveURL(/\/playbooks/)
    await expect(page.getByText('Playbooks')).toBeVisible()
  })

  test('navigates to audit log', async ({ page }) => {
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page).toHaveURL(/\/audit/)
    await expect(page.getByText('Audit Log')).toBeVisible()
  })
})

test.describe('Seed and verify demo data', () => {
  test.beforeEach(async ({ page }) => { await seedAndLogin(page) })

  test('can seed demo data from settings', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Demo Data')).toBeVisible()
    await page.getByRole('button', { name: /Seed Demo Data/i }).click()
    await expect(page.getByText(/Seeded/i)).toBeVisible({ timeout: 15000 })
  })
})
