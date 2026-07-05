import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * DELETE /api/admin/plans/[planId]
 *   Removes the DB override for a plan, reverting to the default catalog
 *   entry (if any). Does NOT delete built-in plans (free/pro/business/enterprise).
 */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  const { planId } = await params
  if (!planId) {
    return NextResponse.json({ success: false, error: 'planId requerido' }, { status: 400 })
  }

  // Block deletion of built-in plan overrides (just revert to default)
  const builtin = ['free', 'pro', 'business', 'enterprise']
  if (builtin.includes(planId)) {
    return NextResponse.json(
      { success: false, error: 'No se puede eliminar un plan built-in. Usa PATCH para desactivarlo.' },
      { status: 400 }
    )
  }

  try {
    await db.planOverride.deleteMany({ where: { planId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo eliminar: ' + (e as Error).message },
      { status: 500 }
    )
  }
}
