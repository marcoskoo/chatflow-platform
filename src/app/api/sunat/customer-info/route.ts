import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/customer-info?customerId=xxx
 *
 * POST /api/sunat/customer-info
 *   body: { customerId, docType, docNumber, razonSocial, address, district, province, department, ubigeo, email, phone }
 *
 * PUT /api/sunat/customer-info
 *   body: same as POST (updates existing)
 *
 * Stores Peruvian tax info (RUC/DNI + reason/social name + address) required
 * to emit Facturas or Boletas.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const customerId = req.nextUrl.searchParams.get('customerId')
  if (!customerId) return NextResponse.json({ error: 'customerId requerido' }, { status: 400 })

  const info = await db.customerTaxInfo.findUnique({ where: { customerId } })
  return NextResponse.json({ success: true, data: info })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const body = await req.json()
  const { customerId, docType, docNumber, razonSocial } = body
  if (!customerId || !docType || !docNumber || !razonSocial) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Validate doc number length
  if (docType === '6' && docNumber.length !== 11) {
    return NextResponse.json({ error: 'RUC debe tener 11 dígitos' }, { status: 400 })
  }
  if (docType === '1' && docNumber.length !== 8) {
    return NextResponse.json({ error: 'DNI debe tener 8 dígitos' }, { status: 400 })
  }

  const info = await db.customerTaxInfo.upsert({
    where: { customerId },
    create: {
      customerId,
      docType,
      docNumber,
      razonSocial,
      address: body.address || null,
      district: body.district || null,
      province: body.province || null,
      department: body.department || null,
      ubigeo: body.ubigeo || null,
      email: body.email || null,
      phone: body.phone || null,
    },
    update: {
      docType,
      docNumber,
      razonSocial,
      address: body.address || null,
      district: body.district || null,
      province: body.province || null,
      department: body.department || null,
      ubigeo: body.ubigeo || null,
      email: body.email || null,
      phone: body.phone || null,
    },
  })

  return NextResponse.json({ success: true, data: info })
}

export async function PUT(req: NextRequest) {
  return POST(req)
}
