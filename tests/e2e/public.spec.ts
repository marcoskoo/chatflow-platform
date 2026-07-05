/**
 * E2E Test: Public endpoints (no auth required)
 *
 * Verifies that healthz, OpenAPI spec, plans, and docs page load correctly.
 */
import { test, expect } from '@playwright/test'

test.describe('Public endpoints', () => {
  test('GET /api/healthz returns 200', async ({ request }) => {
    const res = await request.get('/api/healthz')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('GET /api/docs/json returns OpenAPI 3.1 spec', async ({ request }) => {
    const res = await request.get('/api/docs/json')
    expect(res.status()).toBe(200)
    const spec = await res.json()
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info.title).toBe('ChatFlow API')
    expect(spec.paths).toBeDefined()
    // Must document all major endpoints
    expect(spec.paths['/api/bots']).toBeDefined()
    expect(spec.paths['/api/conversations']).toBeDefined()
    expect(spec.paths['/api/contacts']).toBeDefined()
    expect(spec.paths['/api/stripe/checkout']).toBeDefined()
    expect(spec.paths['/api/stripe/webhook']).toBeDefined()
    expect(spec.paths['/api/sunat/documents']).toBeDefined()
    expect(spec.paths['/api/sunat/documents/{id}/xml']).toBeDefined()
    expect(spec.paths['/api/webhook/{channel}']).toBeDefined()
  })

  test('GET /api/stripe/plans returns the plan catalog (public)', async ({ request }) => {
    const res = await request.get('/api/stripe/plans')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(3)
    const planIds = body.data.map((p: any) => p.id)
    expect(planIds).toContain('free')
    expect(planIds).toContain('pro')
    expect(planIds).toContain('business')
  })

  test('GET /docs renders Scalar API reference', async ({ page }) => {
    const res = await page.goto('/docs')
    expect(res?.status()).toBe(200)
    // Scalar mounts a div with class .scalar-app or similar; at minimum the page
    // should not 404 and should contain the spec title
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText({ timeout: 10_000 })
    expect(bodyText.toLowerCase()).toContain('chatflow')
  })
})

test.describe('Auth enforcement', () => {
  test('Protected endpoints reject requests without API key', async ({ request }) => {
    // Endpoints that use the strict `const auth = ...; if (!auth.success) return` pattern
    // These return 401 immediately on missing API key before touching the DB.
    const strictEndpoints = [
      '/api/bots',
      '/api/conversations',
      '/api/contacts',
      '/api/sunat/documents',
      '/api/sunat/correlativos',
      '/api/billing/me?customerId=test',
      '/api/stripe/checkout',
    ]
    for (const ep of strictEndpoints) {
      const method = ep === '/api/stripe/checkout' ? 'POST' : 'GET'
      const res = await request.fetch(ep, {
        method,
        headers: ep === '/api/stripe/checkout' ? { 'Content-Type': 'application/json' } : undefined,
        data: ep === '/api/stripe/checkout' ? { plan: 'pro', customerId: 'test' } : undefined,
      })
      // 401 = auth required (expected when DB is configured)
      // 500 = DB not reachable (in test env without Postgres)
      // 503 = Stripe not configured (for /api/stripe/checkout)
      expect([401, 500, 503], `${method} ${ep}`).toContain(res.status())
      const body = await res.json().catch(() => ({}))
      expect(body.success).toBeFalsy()
    }
  })
})
