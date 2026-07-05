import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/payment-methods/[id]
 *   Updates an existing payment method. Same body shape as POST (all fields optional).
 *
 * DELETE /api/admin/payment-methods/[id]
 *   Permanently removes a payment method.
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (body.label !== undefined) data.label = String(body.label)
    if (body.currency !== undefined) data.currency = String(body.currency)
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.config !== undefined) data.config = JSON.stringify(body.config || {})
    if (body.qrImageUrl !== undefined) data.qrImageUrl = body.qrImageUrl ? String(body.qrImageUrl) : null
    if (body.instructions !== undefined) data.instructions = body.instructions ? String(body.instructions) : null
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

    const updated = await db.paymentMethod.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo actualizar: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: 'id requerido' }, { status: 400 })
  }

  try {
    await db.paymentMethod.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo eliminar: ' + (e as Error).message },
      { status: 500 }
    )
  }
}
