/**
 * E2E Test: SUNAT electronic invoicing.
 *
 * Exercises the full SUNAT document lifecycle:
 *   1. Save customer tax info (RUC -> Factura)
 *   2. Create a SUNAT document manually
 *   3. Verify XML is generated (download)
 *   4. Verify PDF (HTML view) loads
 *   5. Verify document appears in list
 *   6. Test DNI -> Boleta validation
 *
 * Requires a valid API key in environment variable ADMIN_API_KEY.
 * If not set, tests are skipped (use --update-snapshots or env).
 */
import { test, expect } from '@playwright/test'

const API_KEY = process.env.ADMIN_API_KEY || ''
const testCustomerId = `e2e_cust_${Date.now()}`

test.describe('SUNAT electronic invoicing', () => {
  test.skip(!API_KEY, 'ADMIN_API_KEY env var required')

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  test('save customer tax info with RUC', async ({ request }) => {
    const res = await request.post('/api/sunat/customer-info', {
      headers,
      data: {
        customerId: testCustomerId,
        docType: '6',
        docNumber: '20512345678',
        razonSocial: 'Empresa Test SAC E2E',
        address: 'Av. Javier Prado 1234',
        district: 'San Isidro',
        province: 'LIMA',
        department: 'LIMA',
        ubigeo: '150131',
        email: 'test@example.com',
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.docNumber).toBe('20512345678')
    expect(body.data.docType).toBe('6')
  })

  test('rejects invalid RUC length', async ({ request }) => {
    const res = await request.post('/api/sunat/customer-info', {
      headers,
      data: {
        customerId: testCustomerId + '_bad',
        docType: '6',
        docNumber: '123', // too short
        razonSocial: 'Test',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('create Factura document with valid RUC customer', async ({ request }) => {
    const res = await request.post('/api/sunat/documents', {
      headers,
      data: {
        customerId: testCustomerId,
        tipoDocumento: '01', // Factura
        items: [
          {
            descripcion: 'Suscripción ChatFlow Pro (E2E test)',
            cantidad: 1,
            precioUnitario: 118.00, // includes IGV
          },
        ],
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tipoDocumento).toBe('01')
    expect(body.data.serie).toBe('F001')
    expect(body.data.correlativo).toBeGreaterThan(0)
    // Save id for follow-up tests
    process.env.E2E_SUNAT_DOC_ID = body.data.id
  })

  test('rejects Boleta for customer with RUC', async ({ request }) => {
    const res = await request.post('/api/sunat/documents', {
      headers,
      data: {
        customerId: testCustomerId,
        tipoDocumento: '03', // Boleta (invalid for RUC)
        items: [{ descripcion: 'Test', cantidad: 1, precioUnitario: 100 }],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('document has XML generated', async ({ request }) => {
    const docId = process.env.E2E_SUNAT_DOC_ID
    test.skip(!docId, 'previous test did not produce a doc id')
    const res = await request.get(`/api/sunat/documents/${docId}`, { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.xmlFirmado).toBeTruthy()
    expect(body.data.xmlFirmado).toContain('Invoice')
    expect(body.data.xmlFirmado).toContain('UBLVersionID')
    expect(body.data.xmlFirmado).toContain('20512345678')
    expect(body.data.xmlFileName).toContain('.xml')
  })

  test('download XML returns application/xml', async ({ request }) => {
    const docId = process.env.E2E_SUNAT_DOC_ID
    test.skip(!docId, 'no doc id')
    const res = await request.get(`/api/sunat/documents/${docId}/xml`, { headers })
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] || ''
    expect(ct).toContain('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<?xml')
    expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')
  })

  test('PDF view returns printable HTML', async ({ request }) => {
    const docId = process.env.E2E_SUNAT_DOC_ID
    test.skip(!docId, 'no doc id')
    const res = await request.get(`/api/sunat/documents/${docId}/pdf`, { headers })
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] || ''
    expect(ct).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('FACTURA ELECTRÓNICA')
    expect(html).toContain('Empresa Test SAC E2E')
    expect(html).toContain('F001-')
  })

  test('document appears in list with estado=pendiente', async ({ request }) => {
    const res = await request.get(`/api/sunat/documents?customerId=${testCustomerId}`, { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    const doc = body.data.find((d: any) => d.id === process.env.E2E_SUNAT_DOC_ID)
    expect(doc).toBeDefined()
    expect(doc.estado).toBe('pendiente')
    expect(doc.customerDocNumber).toBe('20512345678')
    // IGV validation: 118 / 1.18 = 100 base, 18 IGV
    expect(Number(doc.totalGravada)).toBeCloseTo(100, 2)
    expect(Number(doc.totalIgv)).toBeCloseTo(18, 2)
    expect(Number(doc.total)).toBeCloseTo(118, 2)
  })

  test('correlativos endpoint returns counters', async ({ request }) => {
    const res = await request.get('/api/sunat/correlativos', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    const f001 = body.data.find((r: any) => r.tipoDocumento === '01' && r.serie === 'F001')
    expect(f001).toBeDefined()
    expect(f001.ultimoCorrelativo).toBeGreaterThan(0)
  })

  test('issuer endpoint returns public issuer info', async ({ request }) => {
    const res = await request.get('/api/sunat/issuer', { headers })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    // Fields can be null in dev/test environments
    expect(body.data).toHaveProperty('ruc')
    expect(body.data).toHaveProperty('razonSocial')
  })
})
