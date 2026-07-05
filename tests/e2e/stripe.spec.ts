/**
 * E2E Test: Stripe integration.
 *
 * Tests the public endpoints and auth-protected endpoints of the Stripe
 * integration. Real Stripe checkout is not invoked (would require a live
 * payment flow); instead we verify:
 *   - Plan catalog loads
 *   - Checkout endpoint validates inputs
 *   - Portal endpoint validates inputs
 *   - Webhook endpoint rejects invalid signatures
 *
 * To test the full webhook flow, see tests/e2e/stripe-webhook.spec.ts.
 */
import { test, expect } from '@playwright/test'

const API_KEY = process.env.ADMIN_API_KEY || ''
const authHeaders = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

test.describe('Stripe integration', () => {
  test('plans endpoint is public (no auth needed)', async ({ request }) => {
    const res = await request.get('/api/stripe/plans')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const pro = body.data.find((p: any) => p.id === 'pro')
    expect(pro).toBeDefined()
    expect(pro.priceMonthly).toBeGreaterThan(0)
    expect(pro.conversationsLimit).toBeGreaterThan(pro.messagesLimit ? 0 : 0)
  })

  test.describe('checkout', () => {
    test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

    test('rejects missing plan', async ({ request }) => {
      const res = await request.post('/api/stripe/checkout', {
        headers: authHeaders,
        data: { customerId: 'test' },
      })
      expect(res.status()).toBe(400)
    })

    test('rejects free plan', async ({ request }) => {
      const res = await request.post('/api/stripe/checkout', {
        headers: authHeaders,
        data: { plan: 'free', customerId: 'test' },
      })
      expect(res.status()).toBe(400)
    })

    test('rejects enterprise plan', async ({ request }) => {
      const res = await request.post('/api/stripe/checkout', {
        headers: authHeaders,
        data: { plan: 'enterprise', customerId: 'test' },
      })
      expect(res.status()).toBe(400)
    })

    test('returns 503 if Stripe not configured, 500 if price id missing, 200 if ok', async ({ request }) => {
      const res = await request.post('/api/stripe/checkout', {
        headers: authHeaders,
        data: { plan: 'pro', customerId: 'test_e2e' },
      })
      // Possible outcomes depending on env config:
      // 503 - Stripe not configured at all
      // 500 - Stripe configured but plan price id not set
      // 200 - All configured, returns checkout URL
      expect([200, 500, 503]).toContain(res.status())
    })
  })

  test.describe('portal', () => {
    test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

    test('requires customerId', async ({ request }) => {
      const res = await request.post('/api/stripe/portal', {
        headers: authHeaders,
        data: {},
      })
      expect(res.status()).toBe(400)
    })

    test('returns 404 for unknown customer (or 503 if Stripe not configured)', async ({ request }) => {
      const res = await request.post('/api/stripe/portal', {
        headers: authHeaders,
        data: { customerId: 'nonexistent_e2e_' + Date.now() },
      })
      expect([404, 503]).toContain(res.status())
    })
  })

  test('webhook endpoint rejects invalid signature', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      headers: {
        'stripe-signature': 'invalid_signature',
        'Content-Type': 'application/json',
      },
      data: '{"id":"evt_test"}',
    })
    // 400 if Stripe is configured (signature mismatch)
    // 503 if Stripe is NOT configured (no STRIPE_SECRET_KEY in env)
    expect([400, 503]).toContain(res.status())
  })

  test('webhook endpoint rejects missing signature', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"id":"evt_test"}',
    })
    expect([400, 503]).toContain(res.status())
  })
})

test.describe('Billing aggregate endpoint', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('GET /api/billing/me returns empty data for new customer', async ({ request }) => {
    const res = await request.get('/api/billing/me?customerId=new_e2e_' + Date.now(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.subscription).toBeNull()
    expect(body.data.invoices).toEqual([])
    expect(body.data.sunatDocuments).toEqual([])
    expect(body.data.customerTaxInfo).toBeNull()
  })

  test('requires customerId parameter', async ({ request }) => {
    const res = await request.get('/api/billing/me', {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(400)
  })
})
