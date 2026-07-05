import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/documents/[id]/xml
 *   -> Returns the signed XML as application/xml download
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const { id } = await params
  const doc = await db.sunatDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!doc.xmlFirmado) return NextResponse.json({ error: 'XML no generado' }, { status: 404 })

  return new NextResponse(doc.xmlFirmado, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${doc.xmlFileName || 'document.xml'}"`,
    },
  })
}
