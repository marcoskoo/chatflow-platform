import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getEffectivePlans, PLANS } from '@/lib/stripe'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * Create a Stripe Checkout Session for upgrading a subscription.
 *
 * POST /api/stripe/checkout
 *   body: { plan: 'pro'|'business'|'enterprise', annual?: boolean, customerId?: string }
 *   -> { url: 'https://checkout.stripe.com/...' }
 *
 * The customerId can be any internal identifier (workspace id, user id, etc.).
 * It's stored in the Subscription table and used to generate SUNAT docs.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const planId = body.plan as string
  const annual = !!body.annual
  const customerId = (body.customerId as string) || `cust_${Date.now()}`
  const customerEmail = body.customerEmail as string | undefined

  // Use DB-backed plans (editable from panel) with fallback to defaults
  let plans = PLANS
  try {
    plans = await getEffectivePlans()
  } catch {
    // keep defaults
  }
  const plan = plans.find((p) => p.id === planId)
  if (!plan) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }
  if (plan.id === 'free') {
    return NextResponse.json({ error: 'Plan free no requiere checkout' }, { status: 400 })
  }
  if (plan.id === 'enterprise') {
    return NextResponse.json({ error: 'Enterprise requiere contacto previo' }, { status: 400 })
  }

  const priceId = annual ? plan.stripePriceIdAnnual : plan.stripePriceId
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID no configurado para plan ${plan.id} ${annual ? 'anual' : 'mensual'}` },
      { status: 500 }
    )
  }

  // Look up existing Stripe customer id (if subscription exists)
  const existingSub = await db.subscription.findUnique({ where: { customerId } })
  const stripeCustomerId = existingSub?.stripeCustomerId || undefined

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    customer_email: stripeCustomerId ? undefined : customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?billing=cancel`,
    metadata: { planId: plan.id, customerId, annual: String(annual) },
    subscription_data: {
      metadata: { planId: plan.id, customerId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
