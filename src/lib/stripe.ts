import Stripe from 'stripe'
import { db } from './db'

/**
 * Stripe singleton. Returns null when no secret key is configured so the app
 * keeps working in environments without billing enabled (e.g. local dev,
 * free tier deployments).
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  _stripe = new Stripe(secretKey, {
    // Pin the API version. If the installed Stripe lib doesn't have this
    // constant, fall back to a plain string. Newer libs (2026+) dropped
    // the LatestApiVersion type.
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  })
  return _stripe
}

// ─── Plan catalog ────────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: string
  name: string
  description: string
  priceMonthly: number // in currency cents (e.g. 4900 = S/ 49.00)
  priceAnnual: number // optional annual price in cents (one-time per year)
  currency: string // PEN, USD
  conversationsLimit: number
  messagesLimit: number
  seats: number
  features: string[]
  stripePriceId?: string // monthly
  stripePriceIdAnnual?: string // annual
  isActive: boolean
  sortOrder: number
  isFeatured: boolean
  ctaLabel: string
}

/**
 * Default catalog. Used to seed PlanOverride rows on first run, and as a
 * fallback when the DB is unreachable (e.g. local dev without Postgres).
 *
 * The admin can edit any of these values from the Subscription panel; the
 * DB version always wins.
 */
export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para empezar a explorar ChatFlow',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'PEN',
    conversationsLimit: 100,
    messagesLimit: 1000,
    seats: 1,
    features: ['1 bot', '1 canal', 'Soporte por email'],
    isActive: true,
    sortOrder: 0,
    isFeatured: false,
    ctaLabel: 'Gratis',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para equipos pequeños en crecimiento',
    priceMonthly: 4900, // S/ 49.00
    priceAnnual: 470400, // S/ 470.40 (-20%)
    currency: 'PEN',
    conversationsLimit: 5000,
    messagesLimit: 50000,
    seats: 3,
    features: ['5 bots', 'Todos los canales', 'Plantillas HSM', 'Soporte prioritario'],
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    isActive: true,
    sortOrder: 1,
    isFeatured: true,
    ctaLabel: 'Suscribir',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Para empresas con alto volumen',
    priceMonthly: 14900, // S/ 149.00
    priceAnnual: 143040, // S/ 1,430.40 (-20%)
    currency: 'PEN',
    conversationsLimit: 25000,
    messagesLimit: 250000,
    seats: 10,
    features: ['Bots ilimitados', 'White label', 'API sin límites', 'SLA 99.9%', 'Account manager'],
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
    isActive: true,
    sortOrder: 2,
    isFeatured: false,
    ctaLabel: 'Suscribir',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solución a medida',
    priceMonthly: 0, // custom
    priceAnnual: 0,
    currency: 'PEN',
    conversationsLimit: 1000000,
    messagesLimit: 10000000,
    seats: 100,
    features: ['On-premise opcional', 'SSO/SAML', 'Cumplimiento HIPAA', 'Soporte 24/7'],
    isActive: true,
    sortOrder: 3,
    isFeatured: false,
    ctaLabel: 'Contactar ventas',
  },
]

/**
 * Get the full plan catalog, merging DB overrides on top of the default PLANS.
 * Returns DB-only overrides if a plan was added from the panel, and falls
 * back to PLANS for anything not yet persisted.
 *
 * NEVER throws — if the DB is unreachable, returns PLANS as-is.
 */
export async function getEffectivePlans(): Promise<PlanDefinition[]> {
  try {
    const overrides = await db.planOverride.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    if (overrides.length === 0) return PLANS

    // Index overrides by planId for O(1) lookup
    const byId = new Map(overrides.map((o) => [o.planId, o]))

    // Start from defaults, override when present, then append extra DB-only plans
    const merged: PlanDefinition[] = []
    for (const def of PLANS) {
      const ov = byId.get(def.id)
      if (ov) {
        merged.push({
          id: ov.planId,
          name: ov.name,
          description: ov.description,
          priceMonthly: ov.priceMonthly,
          priceAnnual: ov.priceAnnual,
          currency: ov.currency,
          conversationsLimit: ov.conversationsLimit,
          messagesLimit: ov.messagesLimit,
          seats: ov.seats,
          features: safeParseFeatures(ov.features),
          stripePriceId: ov.stripePriceId || undefined,
          stripePriceIdAnnual: ov.stripePriceIdAnnual || undefined,
          isActive: ov.isActive,
          sortOrder: ov.sortOrder,
          isFeatured: ov.isFeatured,
          ctaLabel: ov.ctaLabel,
        })
        byId.delete(def.id)
      } else {
        merged.push(def)
      }
    }
    // Append any DB-only plans (added from the panel)
    for (const ov of byId.values()) {
      merged.push({
        id: ov.planId,
        name: ov.name,
        description: ov.description,
        priceMonthly: ov.priceMonthly,
        priceAnnual: ov.priceAnnual,
        currency: ov.currency,
        conversationsLimit: ov.conversationsLimit,
        messagesLimit: ov.messagesLimit,
        seats: ov.seats,
        features: safeParseFeatures(ov.features),
        stripePriceId: ov.stripePriceId || undefined,
        stripePriceIdAnnual: ov.stripePriceIdAnnual || undefined,
        isActive: ov.isActive,
        sortOrder: ov.sortOrder,
        isFeatured: ov.isFeatured,
        ctaLabel: ov.ctaLabel,
      })
    }
    // Final sort by sortOrder
    return merged.sort((a, b) => a.sortOrder - b.sortOrder)
  } catch {
    return PLANS
  }
}

function safeParseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId)
}

/**
 * Synchronous variant — only looks at the default catalog. Use
 * `getEffectivePlans()` instead whenever you have an `await` available
 * (route handlers, server actions).
 */
export async function getEffectivePlan(planId: string): Promise<PlanDefinition | undefined> {
  const plans = await getEffectivePlans()
  return plans.find((p) => p.id === planId)
}

// ─── Webhook helpers ─────────────────────────────────────────────────────────

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * Construct a Stripe Event from a raw payload and signature.
 * Throws if signature is invalid.
 */
export function constructStripeEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe no está configurado')
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
}
