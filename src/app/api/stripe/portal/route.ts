import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * Create a Stripe Customer Portal session for managing an active subscription
 * (upgrade/downgrade, change payment method, cancel, view invoices).
 *
 * POST /api/stripe/portal
 *   body: { customerId: string }
 *   -> { url: 'https://billing.stripe.com/...' }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const customerId = body.customerId as string
  if (!customerId) {
    return NextResponse.json({ error: 'customerId es requerido' }, { status: 400 })
  }

  const sub = await db.subscription.findUnique({ where: { customerId } })
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 404 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?billing=portal`,
  })

  return NextResponse.json({ url: session.url })
}
