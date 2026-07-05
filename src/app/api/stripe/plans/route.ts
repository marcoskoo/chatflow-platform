import { NextRequest, NextResponse } from 'next/server'
import { getEffectivePlans, PLANS } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * GET /api/stripe/plans
 *
 * Returns the public plan catalog. Plans are first read from the database
 * (PlanOverride table — editable from the Subscription panel), and any plan
 * not yet overridden falls back to the default catalog (PLANS).
 *
 * Each plan includes the Stripe price IDs when configured. The frontend
 * uses `stripePriceId` to decide whether the "Suscribir" button is enabled.
 */
export async function GET(_req: NextRequest) {
  // Try DB-backed plans; fall back to defaults if DB is unreachable.
  let plans = PLANS
  try {
    plans = await getEffectivePlans()
  } catch {
    // keep defaults
  }

  return NextResponse.json({
    success: true,
    data: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceAnnual: p.priceAnnual,
      currency: p.currency,
      conversationsLimit: p.conversationsLimit,
      messagesLimit: p.messagesLimit,
      seats: p.seats,
      features: p.features,
      stripePriceId: p.stripePriceId || null,
      stripePriceIdAnnual: p.stripePriceIdAnnual || null,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      isFeatured: p.isFeatured,
      ctaLabel: p.ctaLabel,
    })),
  })
}
