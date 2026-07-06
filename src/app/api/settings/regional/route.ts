import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/settings/regional
 * Returns the singleton regional settings row (Peru/PEN/IGV by default).
 * The senderToken field is masked for security.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    let row = await db.regionalSettings.findUnique({ where: { id: 'default' } })
    if (!row) {
      // Defensive: seed on first read
      row = await db.regionalSettings.create({
        data: { id: 'default' },
      })
    }
    // Mask the sender token
    const masked = {
      ...row,
      senderToken: row.senderToken ? '(configurado)' : null,
      taxRate: Number(row.taxRate),
    }
    return NextResponse.json({ success: true, data: masked })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/regional
 * Updates the singleton regional settings row.
 * Body: partial RegionalSettings fields.
 * Returns the updated row (senderToken masked).
 */
export async function PUT(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()

    // Whitelist updatable fields
    const allowed: Record<string, unknown> = {}
    const stringFields = [
      'country', 'countryName', 'currencyCode', 'currencySymbol', 'currencyName',
      'taxName', 'locale', 'timezone',
      'issuerRuc', 'issuerRazonSocial', 'issuerNombreComercial',
      'issuerDireccion', 'issuerDepartamento', 'issuerProvincia',
      'issuerDistrito', 'issuerUbigeo', 'issuerUrbanizacion',
      'senderUrl',
    ]
    for (const f of stringFields) {
      if (typeof body[f] === 'string') allowed[f] = body[f]
    }
    if (typeof body.taxRate === 'number' && body.taxRate >= 0 && body.taxRate <= 1) {
      allowed.taxRate = body.taxRate
    }
    // senderToken: only update if non-empty string provided
    if (typeof body.senderToken === 'string' && body.senderToken.trim()) {
      allowed.senderToken = body.senderToken.trim()
    }

    const updated = await db.regionalSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...allowed },
      update: allowed,
    })

    const masked = {
      ...updated,
      senderToken: updated.senderToken ? '(configurado)' : null,
      taxRate: Number(updated.taxRate),
    }
    return NextResponse.json({ success: true, data: masked })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
