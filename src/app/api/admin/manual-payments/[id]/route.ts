import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/manual-payments/[id]
 *   Updates a manual payment. Most commonly used to verify or reject:
 *     { status: "verified" | "rejected" | "refunded", notes?: string }
 *   When status becomes "verified", sets verifiedAt = now and verifiedBy = apiKey.name.
 *
 * DELETE /api/admin/manual-payments/[id]
 *   Permanently removes a manual payment record.
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

    if (body.status !== undefined) {
      const status = String(body.status)
      const valid = ['pending', 'verified', 'rejected', 'refunded']
      if (!valid.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status inválido. Permitidos: ${valid.join(', ')}` },
          { status: 400 }
        )
      }
      data.status = status
      if (status === 'verified') {
        data.verifiedAt = new Date()
        data.verifiedBy = auth.apiKey?.name || 'admin'
      }
    }
    if (body.notes !== undefined) data.notes = String(body.notes)
    if (body.operationNumber !== undefined) data.operationNumber = String(body.operationNumber)

    const updated = await db.manualPayment.update({ where: { id }, data })
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
    await db.manualPayment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo eliminar: ' + (e as Error).message },
      { status: 500 }
    )
  }
}
