/**
 * E2E Test: Dashboard UI smoke test.
 *
 * Verifies that the main page loads (HTTP 200), the docs page renders, and
 * no JS errors are thrown. The BootstrapGate setup dialog may show up if
 * there's no API key configured; we accept either state.
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard UI', () => {
  test('home page loads without fatal errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const res = await page.goto('/')
    expect(res?.status()).toBe(200)

    // Title
    const title = await page.title()
    expect(title).toContain('ChatFlow')

    // Should not have any fatal JS errors (hydration mismatches tolerated)
    const fatalErrors = errors.filter(
      (e) => !e.includes('Hydration') && !e.includes('hydrat')
    )
    expect(fatalErrors, JSON.stringify(fatalErrors)).toEqual([])
  })

  test('home page renders loader or sidebar', async ({ page }) => {
    await page.goto('/')
    // Either the loader ("Cargando") or the sidebar should be visible
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // give React time to mount
    const bodyText = await page.locator('body').innerText({ timeout: 10_000 })
    // One of these should be present
    const hasLoader = bodyText.includes('Cargando')
    const hasSidebar = bodyText.includes('Dashboard') || bodyText.includes('Chatbots')
    const hasSetup = bodyText.includes('Setup') || bodyText.includes('API Key') || bodyText.includes('ChatFlow')
    expect(hasLoader || hasSidebar || hasSetup).toBe(true)
  })
})

test.describe('Docs page', () => {
  test('renders Scalar API reference with chatflow content', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    // Scalar takes a bit to render
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').innerText({ timeout: 15_000 })
    // Should contain ChatFlow somewhere
    expect(bodyText.toLowerCase()).toContain('chatflow')
  })

  test('docs page has no fatal JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('Hydration') && !e.includes('hydrat')
    )
    expect(fatalErrors, JSON.stringify(fatalErrors)).toEqual([])
  })
})
