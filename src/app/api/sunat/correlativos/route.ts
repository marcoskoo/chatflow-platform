import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/correlativos
 *
 * Returns the current correlativo counters per (tipoDocumento, serie).
 * Used by the UI to show "next number" preview.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const rows = await db.sunatCorrelativo.findMany({ orderBy: [{ tipoDocumento: 'asc' }, { serie: 'asc' }] })
  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({
      ...r,
      proximoCorrelativo: r.ultimoCorrelativo + 1,
      proximoDocNumber: `${r.serie}-${String(r.ultimoCorrelativo + 1).padStart(8, '0')}`,
    })),
  })
}
