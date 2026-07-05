import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { submitToSunat, generateUblXml, calculateTotals, type SunatItem, type SunatIssuer, type SunatCustomer, DOC_FACTURA, DOC_BOLETA, DOC_TYPE_RUC, DOC_TYPE_DNI } from '@/lib/sunat'

export const runtime = 'nodejs'

/**
 * GET /api/sunat/documents?customerId=xxx
 *
 * Returns SUNAT documents filtered by customer (subscription).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const customerId = req.nextUrl.searchParams.get('customerId')
  const estado = req.nextUrl.searchParams.get('estado')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)

  const where: any = {}
  if (customerId) {
    const sub = await db.subscription.findUnique({ where: { customerId } })
    where.subscriptionId = sub?.id
  }
  if (estado) where.estado = estado

  const docs = await db.sunatDocument.findMany({
    where,
    orderBy: { fechaEmision: 'desc' },
    take: limit,
    include: { customerTaxInfo: true },
  })

  return NextResponse.json({
    success: true,
    data: docs.map((d) => ({
      id: d.id,
      tipoDocumento: d.tipoDocumento,
      serie: d.serie,
      correlativo: d.correlativo,
      docNumber: `${d.serie}-${String(d.correlativo).padStart(8, '0')}`,
      customerDocType: d.customerDocType,
      customerDocNumber: d.customerDocNumber,
      customerName: d.customerName,
      moneda: d.moneda,
      totalGravada: d.totalGravada.toString(),
      totalIgv: d.totalIgv.toString(),
      total: d.total.toString(),
      estado: d.estado,
      sunatTicket: d.sunatTicket,
      sunatResponseCode: d.sunatResponseCode,
      sunatDescription: d.sunatDescription,
      xmlFileName: d.xmlFileName,
      pdfUrl: d.pdfUrl,
      fechaEmision: d.fechaEmision,
      createdAt: d.createdAt,
    })),
  })
}

/**
 * POST /api/sunat/documents
 *
 * Manually create a SUNAT document (for cases where the Stripe webhook didn't
 * auto-generate one, e.g. for off-platform sales).
 *
 * Body:
 *   {
 *     customerId: string,
 *     tipoDocumento: '01'|'03',
 *     items: [{ descripcion, cantidad, precioUnitario, igvIncluded? }],
 *     moneda?: 'PEN',
 *     customer?: { docType, docNumber, razonSocial, address? } // override stored info
 *   }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const body = await req.json()
  const { customerId, tipoDocumento, items, moneda, customer: customerOverride } = body

  if (!customerId || !tipoDocumento || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const sub = await db.subscription.findUnique({ where: { customerId } })
  if (!sub) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  // Get customer tax info
  let customerTaxInfo = await db.customerTaxInfo.findUnique({ where: { customerId } })
  if (customerOverride) {
    if (customerTaxInfo) {
      customerTaxInfo = await db.customerTaxInfo.update({
        where: { id: customerTaxInfo.id },
        data: {
          docType: customerOverride.docType || customerTaxInfo.docType,
          docNumber: customerOverride.docNumber || customerTaxInfo.docNumber,
          razonSocial: customerOverride.razonSocial || customerTaxInfo.razonSocial,
          address: customerOverride.address?.direccion || customerTaxInfo.address,
          district: customerOverride.address?.distrito || customerTaxInfo.district,
          province: customerOverride.address?.provincia || customerTaxInfo.province,
          department: customerOverride.address?.departamento || customerTaxInfo.department,
          ubigeo: customerOverride.address?.ubigeo || customerTaxInfo.ubigeo,
        },
      })
    } else {
      customerTaxInfo = await db.customerTaxInfo.create({
        data: {
          customerId,
          docType: customerOverride.docType,
          docNumber: customerOverride.docNumber,
          razonSocial: customerOverride.razonSocial,
          address: customerOverride.address?.direccion || null,
          district: customerOverride.address?.distrito || null,
          province: customerOverride.address?.provincia || null,
          department: customerOverride.address?.departamento || null,
          ubigeo: customerOverride.address?.ubigeo || null,
        },
      })
    }
  }

  // Determine doc type from customer info
  let tipoDoc = tipoDocumento
  if (customerTaxInfo && customerTaxInfo.docType === DOC_TYPE_RUC && tipoDoc === DOC_BOLETA) {
    return NextResponse.json(
      { error: 'Cliente con RUC requiere Factura (01)' },
      { status: 400 }
    )
  }
  if (customerTaxInfo && customerTaxInfo.docType === DOC_TYPE_DNI && tipoDoc === DOC_FACTURA) {
    return NextResponse.json(
      { error: 'Cliente con DNI requiere Boleta (03)' },
      { status: 400 }
    )
  }

  // Calculate totals
  const sunatItems: SunatItem[] = items.map((it: any) => ({
    descripcion: it.descripcion,
    cantidad: Number(it.cantidad),
    precioUnitario: Number(it.precioUnitario),
    igvIncluded: it.igvIncluded ?? true,
    afectoIgv: it.afectoIgv ?? true,
    tipoAfectacion: it.tipoAfectacion ?? '10',
  }))
  const totals = calculateTotals(sunatItems)

  // Get next correlativo
  const serie = tipoDoc === DOC_FACTURA ? 'F001' : 'B001'
  const corrRow = await db.sunatCorrelativo.upsert({
    where: { tipoDocumento_serie: { tipoDocumento: tipoDoc, serie } },
    create: { tipoDocumento: tipoDoc, serie, ultimoCorrelativo: 1 },
    update: { ultimoCorrelativo: { increment: 1 } },
  })
  const correlativo = corrRow.ultimoCorrelativo

  // Build customer object
  const customer: SunatCustomer = {
    docType: customerTaxInfo?.docType || customerOverride?.docType || DOC_TYPE_DNI,
    docNumber: customerTaxInfo?.docNumber || customerOverride?.docNumber || '00000000',
    razonSocial: customerTaxInfo?.razonSocial || customerOverride?.razonSocial || 'Cliente',
    address: customerTaxInfo?.address
      ? {
          ubigeo: customerTaxInfo.ubigeo || undefined,
          departamento: customerTaxInfo.department || undefined,
          provincia: customerTaxInfo.province || undefined,
          distrito: customerTaxInfo.district || undefined,
          direccion: customerTaxInfo.address || undefined,
        }
      : customerOverride?.address,
  }

  // Generate XML
  const issuer = getIssuerFromEnv()
  let xml: string | null = null
  let fileName: string | null = null
  if (issuer) {
    xml = generateUblXml({
      tipoDocumento: tipoDoc,
      serie,
      correlativo,
      fechaEmision: new Date(),
      issuer,
      customer,
      items: sunatItems,
      moneda: moneda || 'PEN',
    })
    fileName = `${issuer.ruc}-${tipoDoc}-${serie}-${String(correlativo).padStart(8, '0')}.xml`
  }

  // Persist
  const doc = await db.sunatDocument.create({
    data: {
      tipoDocumento: tipoDoc,
      serie,
      correlativo,
      customerDocType: customer.docType,
      customerDocNumber: customer.docNumber,
      customerName: customer.razonSocial,
      customerAddress: customer.address?.direccion || null,
      moneda: moneda || 'PEN',
      totalGravada: totals.totalGravada,
      totalIgv: totals.totalIgv,
      totalExonerada: totals.totalExonerada,
      totalInafecta: totals.totalInafecta,
      totalGratuita: totals.totalGratuita,
      totalDescuento: totals.totalDescuento,
      total: totals.total,
      items: JSON.stringify(items),
      estado: 'pendiente',
      subscriptionId: sub.id,
      customerTaxInfoId: customerTaxInfo?.id,
      xmlFirmado: xml,
      xmlFileName: fileName,
      fechaEmision: new Date(),
    },
  })

  // Optionally submit to SUNAT immediately
  const autoSubmit = body.autoSubmit === true
  if (autoSubmit && xml && fileName && issuer) {
    const result = await submitToSunat(xml, fileName, issuer.ruc)
    await db.sunatDocument.update({
      where: { id: doc.id },
      data: {
        estado: result.success ? 'enviado' : 'rechazado',
        sunatTicket: result.ticket,
        sunatResponseCode: result.responseCode,
        sunatDescription: result.description,
        cdrZipBase64: result.cdrZipBase64 || null,
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      serie: doc.serie,
      correlativo: doc.correlativo,
      docNumber: `${doc.serie}-${String(doc.correlativo).padStart(8, '0')}`,
      estado: doc.estado,
      total: doc.total.toString(),
    },
  })
}

function getIssuerFromEnv(): SunatIssuer | null {
  const ruc = process.env.SUNAT_ISSUER_RUC
  const razonSocial = process.env.SUNAT_ISSUER_RAZON_SOCIAL
  const direccion = process.env.SUNAT_ISSUER_DIRECCION
  if (!ruc || !razonSocial || !direccion) return null
  return {
    ruc,
    razonSocial,
    nombreComercial: process.env.SUNAT_ISSUER_NOMBRE_COMERCIAL,
    address: {
      ubigeo: process.env.SUNAT_ISSUER_UBIGEO || '150101',
      departamento: process.env.SUNAT_ISSUER_DEPARTAMENTO || 'LIMA',
      provincia: process.env.SUNAT_ISSUER_PROVINCIA || 'LIMA',
      distrito: process.env.SUNAT_ISSUER_DISTRITO || 'LIMA',
      direccion,
      codLocal: '0000',
    },
  }
}
