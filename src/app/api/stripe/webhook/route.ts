import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStripe, constructStripeEvent, STRIPE_WEBHOOK_SECRET, getPlan } from '@/lib/stripe'
import { generateUblXml, calculateTotals, type SunatItem, type SunatIssuer, type SunatCustomer, DOC_FACTURA, DOC_BOLETA, DOC_TYPE_RUC, DOC_TYPE_DNI } from '@/lib/sunat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook handler.
 *
 * Events handled:
 *   - checkout.session.completed           -> creates Subscription
 *   - customer.subscription.updated        -> updates plan/status/limits
 *   - customer.subscription.deleted        -> marks subscription canceled
 *   - invoice.payment_succeeded            -> records Invoice + triggers SUNAT doc
 *   - invoice.payment_failed               -> marks invoice failed
 *
 * The endpoint verifies the Stripe signature using STRIPE_WEBHOOK_SECRET.
 *
 * For SUNAT electronic invoicing: when a Stripe invoice is paid, we generate
 * the corresponding Peruvian electronic document (Factura or Boleta).
 * - If customer has RUC (docType=6) -> Factura (01)
 * - If customer has DNI (docType=1) -> Boleta (03)
 * - Without tax info, the doc is created as "pendiente" and the user must
 *   complete it from the dashboard before sending to SUNAT.
 *
 * NOTE: As of Stripe API 2026-06-24, `current_period_start/end` and
 * `invoice.paid` were removed. We use `billing_cycle_anchor` and
 * `invoice.status === 'paid'` respectively.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET no configurado' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Falta stripe-signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event
  try {
    event = constructStripeEvent(rawBody, signature)
  } catch (e) {
    return NextResponse.json(
      { error: 'Firma inválida', detail: e instanceof Error ? e.message : '' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as any
        await handleSubscriptionUpdated(sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        await handleSubscriptionDeleted(sub)
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as any
        await handleInvoicePaid(inv)
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as any
        await db.invoice.updateMany({
          where: { stripeInvoiceId: inv.id },
          data: { status: 'uncollectible' },
        })
        break
      }
      default:
        break
    }
    return NextResponse.json({ received: true, type: event.type })
  } catch (e) {
    console.error('Stripe webhook error', e)
    return NextResponse.json(
      { error: 'Error procesando webhook', detail: e instanceof Error ? e.message : '' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const planId = session.metadata?.planId
  if (!customerId || !subscriptionId || !planId) return

  const stripe = getStripe()!
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const price = sub.items.data[0]?.price
  const plan = getPlan(planId) || (price?.id ? inferPlanFromPrice(price.id) : null)
  if (!plan) return

  // Use billing_cycle_anchor + interval-based period calc
  const anchor = sub.billing_cycle_anchor || Math.floor(Date.now() / 1000)
  const periodStart = new Date(anchor * 1000)
  const periodEnd = new Date(anchor * 1000 + 30 * 24 * 60 * 60 * 1000) // approx 30 days

  await db.subscription.upsert({
    where: { customerId },
    create: {
      customerId,
      plan: plan.id,
      status: 'active',
      seats: plan.seats,
      conversationsLimit: plan.conversationsLimit,
      messagesLimit: plan.messagesLimit,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      stripePriceId: price?.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    update: {
      plan: plan.id,
      status: 'active',
      seats: plan.seats,
      conversationsLimit: plan.conversationsLimit,
      messagesLimit: plan.messagesLimit,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      stripePriceId: price?.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  })
}

async function handleSubscriptionUpdated(sub: any) {
  const customerId = sub.customer as string
  const priceId = sub.items?.data?.[0]?.price?.id
  const plan = priceId ? inferPlanFromPrice(priceId) : null

  const anchor = sub.billing_cycle_anchor || Math.floor(Date.now() / 1000)
  const periodStart = new Date(anchor * 1000)
  const periodEnd = new Date(anchor * 1000 + 30 * 24 * 60 * 60 * 1000)

  // Use upsert so that if the subscription doesn't exist yet (e.g., when
  // customer.subscription.created arrives before checkout.session.completed,
  // or when a subscription is created directly via Stripe API / dashboard),
  // we still create the local record instead of silently failing.
  // We try by stripeSubscriptionId first via a findFirst + upsert pattern.
  const existing = await db.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: sub.id },
        { stripeCustomerId: customerId },
        { customerId },
      ],
    },
  })

  if (existing) {
    // Update existing record by id (guaranteed unique)
    await db.subscription.update({
      where: { id: existing.id },
      data: {
        status: sub.status,
        ...(plan ? {
          plan: plan.id,
          seats: plan.seats,
          conversationsLimit: plan.conversationsLimit,
          messagesLimit: plan.messagesLimit,
        } : {}),
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId || undefined,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    })
  } else {
    // Create new record. customerId here is the Stripe customer id (cus_xxx).
    // If the subscription was created via /api/stripe/checkout with a custom
    // customerId in metadata, we prefer that one; otherwise we use the Stripe
    // customer id as our internal customerId too.
    const internalCustomerId =
      sub.metadata?.customerId || customerId
    await db.subscription.create({
      data: {
        customerId: internalCustomerId,
        status: sub.status,
        ...(plan ? {
          plan: plan.id,
          seats: plan.seats,
          conversationsLimit: plan.conversationsLimit,
          messagesLimit: plan.messagesLimit,
        } : { plan: 'free' }),
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId || undefined,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    })
  }
}

async function handleSubscriptionDeleted(sub: any) {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: 'canceled', cancelAtPeriodEnd: false },
  })
}

async function handleInvoicePaid(inv: any) {
  const customerId = inv.customer as string
  // In Stripe API 2026+, subscription lives in parent.subscription_details.subscription
  const subscriptionId =
    inv.subscription ||
    inv.parent?.subscription_details?.subscription ||
    null

  // Find or create local Subscription
  let subscription = subscriptionId
    ? await db.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
    : null
  if (!subscription && customerId) {
    subscription = await db.subscription.findUnique({ where: { customerId } })
  }

  if (!subscription && customerId) {
    subscription = await db.subscription.upsert({
      where: { customerId },
      create: {
        customerId,
        plan: 'free',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
        status: 'active',
      },
      update: {},
    })
  }

  // Determine invoice status (in new API, use status field)
  const isPaid = inv.status === 'paid' || inv.paid === true
  const invoicePdf = inv.invoice_pdf || null
  const hostedInvoiceUrl = inv.hosted_invoice_url || null

  // Create / update local Invoice
  const localInv = await db.invoice.upsert({
    where: { stripeInvoiceId: inv.id },
    create: {
      subscriptionId: subscription?.id,
      stripeInvoiceId: inv.id,
      amount: inv.total,
      currency: inv.currency,
      status: isPaid ? 'paid' : 'open',
      pdfUrl: invoicePdf || undefined,
      hostedInvoiceUrl: hostedInvoiceUrl || undefined,
    },
    update: {
      subscriptionId: subscription?.id,
      amount: inv.total,
      currency: inv.currency,
      status: isPaid ? 'paid' : 'open',
      pdfUrl: invoicePdf || undefined,
      hostedInvoiceUrl: hostedInvoiceUrl || undefined,
    },
  })

  // Generate SUNAT document if paid (and not already generated).
  // SUNAT is OPTIONAL — disabled unless SUNAT_ENABLED=1 (or =true).
  // Without SUNAT, Stripe billing still works end-to-end: subscriptions,
  // invoices and portal all operate normally.
  const sunatEnabled =
    process.env.SUNAT_ENABLED === '1' || process.env.SUNAT_ENABLED === 'true'
  if (isPaid && sunatEnabled) {
    const existing = await db.sunatDocument.findUnique({
      where: { invoiceId: localInv.id },
    })
    if (!existing) {
      try {
        await generateSunatForInvoice(localInv.id, customerId, inv.total, inv.currency)
      } catch (e) {
        console.error('SUNAT generation failed for invoice', inv.id, e)
      }
    }
  }
}

function inferPlanFromPrice(priceId: string) {
  const env = process.env
  if (env.STRIPE_PRICE_PRO_MONTHLY === priceId || env.STRIPE_PRICE_PRO_ANNUAL === priceId) {
    return getPlan('pro')
  }
  if (
    env.STRIPE_PRICE_BUSINESS_MONTHLY === priceId ||
    env.STRIPE_PRICE_BUSINESS_ANNUAL === priceId
  ) {
    return getPlan('business')
  }
  return null
}

/**
 * Generate a SUNAT document (Factura or Boleta) for a paid Stripe invoice.
 * The doc is created in estado="pendiente" if customer tax info is incomplete;
 * user can review and submit it from the dashboard.
 */
async function generateSunatForInvoice(
  localInvoiceId: string,
  stripeCustomerId: string,
  amountCents: number,
  currency: string
) {
  // Convert amount to PEN. In production use a real FX service; here we use a
  // fixed 3.7 PEN/USD approximation when currency is usd, otherwise pass-through.
  const fxRate = currency === 'usd' ? 3.7 : 1
  const totalPen = Math.round((amountCents / 100) * fxRate * 100) / 100

  // IGV breakdown: total includes IGV. gravada = total / 1.18, igv = gravada * 0.18
  const gravada = Math.round((totalPen / 1.18) * 100) / 100
  const igv = Math.round((totalPen - gravada) * 100) / 100

  // Find the local Subscription
  const subscription = await db.subscription.findFirst({
    where: {
      OR: [{ stripeCustomerId: stripeCustomerId }, { customerId: stripeCustomerId }],
    },
  })
  if (!subscription) return

  // Get customer tax info (if exists)
  const customerTaxInfo = await db.customerTaxInfo.findUnique({
    where: { customerId: subscription.customerId },
  })

  // Determine document type
  let tipoDoc = DOC_BOLETA
  let customerDocType = DOC_TYPE_DNI
  let customerDocNumber = '00000000'
  let customerName = 'Cliente'

  if (customerTaxInfo) {
    customerDocType = customerTaxInfo.docType
    customerDocNumber = customerTaxInfo.docNumber
    customerName = customerTaxInfo.razonSocial
    if (customerTaxInfo.docType === DOC_TYPE_RUC) {
      tipoDoc = DOC_FACTURA
    }
  }

  // Get next correlativo
  const serie = tipoDoc === DOC_FACTURA ? 'F001' : 'B001'
  const corrRow = await db.sunatCorrelativo.upsert({
    where: { tipoDocumento_serie: { tipoDocumento: tipoDoc, serie } },
    create: { tipoDocumento: tipoDoc, serie, ultimoCorrelativo: 1 },
    update: { ultimoCorrelativo: { increment: 1 } },
  })
  const correlativo = corrRow.ultimoCorrelativo

  // Build the SUNAT document
  const sunatDoc = await db.sunatDocument.create({
    data: {
      tipoDocumento: tipoDoc,
      serie,
      correlativo,
      customerDocType,
      customerDocNumber,
      customerName,
      customerAddress: customerTaxInfo?.address || null,
      moneda: 'PEN',
      totalGravada: gravada,
      totalIgv: igv,
      total: totalPen,
      items: JSON.stringify([
        {
          descripcion: `Suscripción ChatFlow plan ${subscription.plan}`,
          cantidad: 1,
          precioUnitario: gravada,
          igv: igv,
          total: totalPen,
        },
      ]),
      estado: 'pendiente',
      invoiceId: localInvoiceId,
      subscriptionId: subscription.id,
      customerTaxInfoId: customerTaxInfo?.id,
      fechaEmision: new Date(),
    },
  })

  // Optionally generate XML immediately so user can review it
  try {
    const issuer = getIssuerFromEnv()
    if (issuer) {
      const items: SunatItem[] = [
        {
          descripcion: `Suscripción ChatFlow plan ${subscription.plan}`,
          cantidad: 1,
          precioUnitario: totalPen,
          igvIncluded: true,
          afectoIgv: true,
          tipoAfectacion: '10',
        },
      ]
      const customer: SunatCustomer = {
        docType: customerDocType,
        docNumber: customerDocNumber,
        razonSocial: customerName,
        address: customerTaxInfo?.address
          ? {
              ubigeo: customerTaxInfo.ubigeo || undefined,
              departamento: customerTaxInfo.department || undefined,
              provincia: customerTaxInfo.province || undefined,
              distrito: customerTaxInfo.district || undefined,
              direccion: customerTaxInfo.address || undefined,
            }
          : undefined,
      }
      const xml = generateUblXml({
        tipoDocumento: tipoDoc,
        serie,
        correlativo,
        fechaEmision: sunatDoc.fechaEmision,
        issuer,
        customer,
        items,
      })
      const fileName = `${issuer.ruc}-${tipoDoc}-${serie}-${String(correlativo).padStart(8, '0')}.xml`
      await db.sunatDocument.update({
        where: { id: sunatDoc.id },
        data: { xmlFirmado: xml, xmlFileName: fileName },
      })
    }
  } catch (e) {
    console.error('XML generation failed', e)
  }
}

function getIssuerFromEnv(): SunatIssuer | null {
  const ruc = process.env.SUNAT_ISSUER_RUC
  const razonSocial = process.env.SUNAT_ISSUER_RAZON_SOCIAL
  const direccion = process.env.SUNAT_ISSUER_DIRECCION
  const ubigeo = process.env.SUNAT_ISSUER_UBIGEO
  const departamento = process.env.SUNAT_ISSUER_DEPARTAMENTO
  const provincia = process.env.SUNAT_ISSUER_PROVINCIA
  const distrito = process.env.SUNAT_ISSUER_DISTRITO
  const nombreComercial = process.env.SUNAT_ISSUER_NOMBRE_COMERCIAL
  if (!ruc || !razonSocial || !direccion) return null
  return {
    ruc,
    razonSocial,
    nombreComercial,
    address: {
      ubigeo: ubigeo || '150101',
      departamento: departamento || 'LIMA',
      provincia: provincia || 'LIMA',
      distrito: distrito || 'LIMA',
      direccion,
      codLocal: '0000',
    },
  }
}
