import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/billing/me?customerId=xxx
 *
 * Returns current subscription, invoices and SUNAT documents for the given
 * internal customer id (workspace/team id).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const customerId = req.nextUrl.searchParams.get('customerId')
  if (!customerId) {
    return NextResponse.json({ error: 'customerId requerido' }, { status: 400 })
  }

  const subscription = await db.subscription.findUnique({
    where: { customerId },
    include: {
      invoices: { orderBy: { createdAt: 'desc' }, take: 50 },
      sunatDocuments: { orderBy: { fechaEmision: 'desc' }, take: 50 },
    },
  })

  if (!subscription) {
    return NextResponse.json({
      success: true,
      data: {
        subscription: null,
        invoices: [],
        sunatDocuments: [],
        customerTaxInfo: null,
      },
    })
  }

  const customerTaxInfo = await db.customerTaxInfo.findUnique({
    where: { customerId },
  })

  return NextResponse.json({
    success: true,
    data: {
      subscription: {
        id: subscription.id,
        customerId: subscription.customerId,
        plan: subscription.plan,
        status: subscription.status,
        seats: subscription.seats,
        conversationsLimit: subscription.conversationsLimit,
        messagesLimit: subscription.messagesLimit,
        stripeCustomerId: subscription.stripeCustomerId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      invoices: subscription.invoices.map((inv) => ({
        id: inv.id,
        stripeInvoiceId: inv.stripeInvoiceId,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.pdfUrl,
        hostedInvoiceUrl: inv.hostedInvoiceUrl,
        createdAt: inv.createdAt,
      })),
      sunatDocuments: subscription.sunatDocuments.map((d) => ({
        id: d.id,
        tipoDocumento: d.tipoDocumento,
        serie: d.serie,
        correlativo: d.correlativo,
        customerName: d.customerName,
        customerDocNumber: d.customerDocNumber,
        moneda: d.moneda,
        totalGravada: d.totalGravada.toString(),
        totalIgv: d.totalIgv.toString(),
        total: d.total.toString(),
        estado: d.estado,
        xmlFileName: d.xmlFileName,
        pdfUrl: d.pdfUrl,
        sunatDescription: d.sunatDescription,
        fechaEmision: d.fechaEmision,
      })),
      customerTaxInfo: customerTaxInfo
        ? {
            id: customerTaxInfo.id,
            docType: customerTaxInfo.docType,
            docNumber: customerTaxInfo.docNumber,
            razonSocial: customerTaxInfo.razonSocial,
            address: customerTaxInfo.address,
            district: customerTaxInfo.district,
            province: customerTaxInfo.province,
            department: customerTaxInfo.department,
            ubigeo: customerTaxInfo.ubigeo,
            email: customerTaxInfo.email,
          }
        : null,
    },
  })
}
