import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/admin/payment-methods
 *   Lists all configured payment methods (bank transfers, Yape, Plin, Stripe).
 *
 * POST /api/admin/payment-methods
 *   Creates a new payment method. Body shape:
 *     {
 *       type: "bank_transfer" | "yape" | "plin" | "stripe",
 *       label: string,
 *       currency?: "PEN" | "USD",
 *       isActive?: boolean,
 *       config?: object,           // type-specific, see below
 *       qrImageUrl?: string,
 *       instructions?: string,
 *       sortOrder?: number,
 *     }
 *
 *   config schemas:
 *     bank_transfer: { bank, accountNumber, cci, holderName, holderDocType, holderDocNumber, email }
 *     yape: { phone, holderName, holderDocType, holderDocNumber }
 *     plin: { phone, holderName, holderDocType, holderDocNumber }
 *     stripe: { publishableKey, mode: 'test'|'live' }
 *
 * Requires 'admin' permission.
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const items = await db.paymentMethod.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      data: items.map((m) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        currency: m.currency,
        isActive: m.isActive,
        config: safeParse(m.config),
        qrImageUrl: m.qrImageUrl || '',
        instructions: m.instructions || '',
        sortOrder: m.sortOrder,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudieron cargar los métodos: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body.type || '').trim()
    if (!type) {
      return NextResponse.json({ success: false, error: 'type es obligatorio' }, { status: 400 })
    }
    const validTypes = ['bank_transfer', 'yape', 'plin', 'stripe']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `type inválido. Permitidos: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const data = {
      type,
      label: String(body.label || defaultLabel(type)),
      currency: String(body.currency || 'PEN'),
      isActive: body.isActive !== undefined ? !!body.isActive : true,
      config: JSON.stringify(body.config || {}),
      qrImageUrl: body.qrImageUrl ? String(body.qrImageUrl) : null,
      instructions: body.instructions ? String(body.instructions) : null,
      sortOrder: Number(body.sortOrder) || 0,
    }

    const saved = await db.paymentMethod.create({ data })
    return NextResponse.json({ success: true, data: saved })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo crear el método: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

function defaultLabel(type: string): string {
  switch (type) {
    case 'bank_transfer':
      return 'Transferencia / Depósito Bancario'
    case 'yape':
      return 'Yape'
    case 'plin':
      return 'Plin'
    case 'stripe':
      return 'Tarjeta Crédito/Débito (Stripe)'
    default:
      return type
  }
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
