import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/admin/manual-payments
 *   Lists manual payment submissions (Yape, Plin, bank transfers) ordered
 *   by status (pending first) then date desc.
 *   Query params: ?status=pending|verified|rejected|refunded
 *
 * POST /api/admin/manual-payments
 *   Registers a manual payment on behalf of a customer. Body shape:
 *     {
 *       method: "bank_transfer" | "yape" | "plin" | "cash",
 *       amount: number,                  // cents in currency
 *       currency?: "PEN" | "USD",
 *       customerId?: string,
 *       customerName?: string,
 *       customerEmail?: string,
 *       operationNumber?: string,
 *       proofUrl?: string,
 *       subscriptionId?: string,
 *       invoiceId?: string,
 *       notes?: string,
 *     }
 *
 * Requires 'admin' permission.
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const take = Math.min(Number(url.searchParams.get('take')) || 100, 500)

    const where = status ? { status } : {}
    const items = await db.manualPayment.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take,
    })

    return NextResponse.json({ success: true, data: items })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudieron cargar los pagos: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const method = String(body.method || '').trim()
    if (!method) {
      return NextResponse.json({ success: false, error: 'method es obligatorio' }, { status: 400 })
    }
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'amount inválido' }, { status: 400 })
    }

    const data = {
      method,
      amount: Math.round(amount),
      currency: String(body.currency || 'PEN'),
      customerId: body.customerId ? String(body.customerId) : null,
      customerName: body.customerName ? String(body.customerName) : null,
      customerEmail: body.customerEmail ? String(body.customerEmail) : null,
      operationNumber: body.operationNumber ? String(body.operationNumber) : null,
      proofUrl: body.proofUrl ? String(body.proofUrl) : null,
      subscriptionId: body.subscriptionId ? String(body.subscriptionId) : null,
      invoiceId: body.invoiceId ? String(body.invoiceId) : null,
      notes: body.notes ? String(body.notes) : null,
      status: 'pending',
    }

    const saved = await db.manualPayment.create({ data })
    return NextResponse.json({ success: true, data: saved })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo registrar el pago: ' + (e as Error).message },
      { status: 500 }
    )
  }
}
