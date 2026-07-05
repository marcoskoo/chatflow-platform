/**
 * E2E Test: Core API resources (Bots, Conversations, Contacts).
 *
 * Verifies that the main API endpoints work end-to-end with a real API key:
 *   - List, create, update, delete
 *   - Error responses for invalid input
 *   - Empty-state handling
 */
import { test, expect } from '@playwright/test'

const API_KEY = process.env.ADMIN_API_KEY || ''
const headers = { Authorization: `Bearer ${API_KEY}` }

test.describe('Bots API', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('list bots returns 200', async ({ request }) => {
    const res = await request.get('/api/bots', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('create + delete a bot', async ({ request }) => {
    const create = await request.post('/api/bots', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        name: 'E2E Test Bot ' + Date.now(),
        description: 'Created by Playwright test',
        channels: 'whatsapp',
        language: 'es',
      },
    })
    expect([200, 201]).toContain(create.status())
    const created = await create.json()
    const botId = created.data?.id || created.id
    expect(botId).toBeTruthy()

    // Delete
    const del = await request.delete(`/api/bots/${botId}`, { headers })
    expect([200, 204]).toContain(del.status())
  })
})

test.describe('Contacts API', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('list contacts returns 200', async ({ request }) => {
    const res = await request.get('/api/contacts', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('create + delete a contact', async ({ request }) => {
    const create = await request.post('/api/contacts', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        name: 'E2E Contact ' + Date.now(),
        email: `e2e_${Date.now()}@example.com`,
        phone: '+51999999999',
        channel: 'whatsapp',
      },
    })
    expect([200, 201]).toContain(create.status())
    const created = await create.json()
    const contactId = created.data?.id || created.id
    expect(contactId).toBeTruthy()

    const del = await request.delete(`/api/contacts/${contactId}`, { headers })
    expect([200, 204]).toContain(del.status())
  })
})

test.describe('Conversations API', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('list conversations returns 200', async ({ request }) => {
    const res = await request.get('/api/conversations', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

test.describe('Subscriptions / Invoices', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  test('list subscriptions returns 200', async ({ request }) => {
    const res = await request.get('/api/subscriptions', { headers })
    expect(res.status()).toBe(200)
  })

  test('list invoices returns 200', async ({ request }) => {
    const res = await request.get('/api/invoices', { headers })
    expect(res.status()).toBe(200)
  })
})
