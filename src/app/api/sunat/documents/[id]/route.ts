import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { submitToSunat } from '@/lib/sunat'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/documents/[id]
 *   -> Fetch a single SUNAT document
 *
 * POST /api/sunat/documents/[id]
 *   body: { action: 'submit' | 'regenerate-xml' }
 *   -> Submit to SUNAT or regenerate the XML
 *
 * DELETE /api/sunat/documents/[id]
 *   -> Mark as anulado (cannot actually delete since it has been issued)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const { id } = await params
  const doc = await db.sunatDocument.findUnique({
    where: { id },
    include: { customerTaxInfo: true, invoice: true, subscription: true },
  })
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      ...doc,
      totalGravada: doc.totalGravada.toString(),
      totalIgv: doc.totalIgv.toString(),
      totalExonerada: doc.totalExonerada.toString(),
      totalInafecta: doc.totalInafecta.toString(),
      totalGratuita: doc.totalGratuita.toString(),
      totalDescuento: doc.totalDescuento.toString(),
      total: doc.total.toString(),
      items: JSON.parse(doc.items),
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const action = body.action as 'submit' | 'regenerate-xml'

  const doc = await db.sunatDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (action === 'submit') {
    if (!doc.xmlFirmado || !doc.xmlFileName) {
      return NextResponse.json({ error: 'XML no generado' }, { status: 400 })
    }
    const issuerRuc = process.env.SUNAT_ISSUER_RUC
    if (!issuerRuc) {
      return NextResponse.json({ error: 'Emisor no configurado' }, { status: 500 })
    }
    const result = await submitToSunat(doc.xmlFirmado, doc.xmlFileName, issuerRuc)
    const updated = await db.sunatDocument.update({
      where: { id },
      data: {
        estado: result.success ? 'enviado' : 'rechazado',
        sunatTicket: result.ticket,
        sunatResponseCode: result.responseCode,
        sunatDescription: result.description,
        cdrZipBase64: result.cdrZipBase64 || null,
      },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const { id } = await params
  const doc = await db.sunatDocument.update({
    where: { id },
    data: { estado: 'anulado' },
  })
  return NextResponse.json({ success: true, data: { id: doc.id, estado: doc.estado } })
}
