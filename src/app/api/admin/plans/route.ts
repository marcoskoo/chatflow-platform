import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { PLANS } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * GET /api/admin/plans
 *   Returns the editable plan catalog (DB overrides merged with defaults).
 *
 * POST /api/admin/plans
 *   Creates or updates a PlanOverride. Body shape:
 *     {
 *       planId: string,
 *       name: string,
 *       description?: string,
 *       priceMonthly: number,
 *       priceAnnual?: number,
 *       currency?: "PEN" | "USD",
 *       conversationsLimit: number,
 *       messagesLimit: number,
 *       seats: number,
 *       features: string[],
 *       stripePriceId?: string,
 *       stripePriceIdAnnual?: string,
 *       isActive?: boolean,
 *       sortOrder?: number,
 *       isFeatured?: boolean,
 *       ctaLabel?: string,
 *     }
 *
 * Requires 'admin' permission.
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const overrides = await db.planOverride.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    const byId = new Map(overrides.map((o) => [o.planId, o]))

    const merged = PLANS.map((def) => {
      const ov = byId.get(def.id)
      if (ov) {
        byId.delete(def.id)
        return {
          id: ov.id,
          planId: ov.planId,
          name: ov.name,
          description: ov.description,
          priceMonthly: ov.priceMonthly,
          priceAnnual: ov.priceAnnual,
          currency: ov.currency,
          conversationsLimit: ov.conversationsLimit,
          messagesLimit: ov.messagesLimit,
          seats: ov.seats,
          features: safeParseFeatures(ov.features),
          stripePriceId: ov.stripePriceId || '',
          stripePriceIdAnnual: ov.stripePriceIdAnnual || '',
          isActive: ov.isActive,
          sortOrder: ov.sortOrder,
          isFeatured: ov.isFeatured,
          ctaLabel: ov.ctaLabel,
          isOverride: true,
        }
      }
      return {
        id: def.id,
        planId: def.id,
        name: def.name,
        description: def.description,
        priceMonthly: def.priceMonthly,
        priceAnnual: def.priceAnnual,
        currency: def.currency,
        conversationsLimit: def.conversationsLimit,
        messagesLimit: def.messagesLimit,
        seats: def.seats,
        features: def.features,
        stripePriceId: def.stripePriceId || '',
        stripePriceIdAnnual: def.stripePriceIdAnnual || '',
        isActive: def.isActive,
        sortOrder: def.sortOrder,
        isFeatured: def.isFeatured,
        ctaLabel: def.ctaLabel,
        isOverride: false,
      }
    })

    // Append any DB-only plans (added from the panel)
    for (const ov of byId.values()) {
      merged.push({
        id: ov.id,
        planId: ov.planId,
        name: ov.name,
        description: ov.description,
        priceMonthly: ov.priceMonthly,
        priceAnnual: ov.priceAnnual,
        currency: ov.currency,
        conversationsLimit: ov.conversationsLimit,
        messagesLimit: ov.messagesLimit,
        seats: ov.seats,
        features: safeParseFeatures(ov.features),
        stripePriceId: ov.stripePriceId || '',
        stripePriceIdAnnual: ov.stripePriceIdAnnual || '',
        isActive: ov.isActive,
        sortOrder: ov.sortOrder,
        isFeatured: ov.isFeatured,
        ctaLabel: ov.ctaLabel,
        isOverride: true,
      })
    }

    return NextResponse.json({ success: true, data: merged })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudieron cargar los planes: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin')
  if (!auth.success) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const planId = String(body.planId || '').trim()
    if (!planId) {
      return NextResponse.json({ success: false, error: 'planId es obligatorio' }, { status: 400 })
    }

    const data = {
      planId,
      name: String(body.name || planId),
      description: String(body.description || ''),
      priceMonthly: Number(body.priceMonthly) || 0,
      priceAnnual: Number(body.priceAnnual) || 0,
      currency: String(body.currency || 'PEN'),
      conversationsLimit: Number(body.conversationsLimit) || 0,
      messagesLimit: Number(body.messagesLimit) || 0,
      seats: Number(body.seats) || 1,
      features: JSON.stringify(Array.isArray(body.features) ? body.features.map(String) : []),
      stripePriceId: body.stripePriceId ? String(body.stripePriceId) : null,
      stripePriceIdAnnual: body.stripePriceIdAnnual ? String(body.stripePriceIdAnnual) : null,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
      sortOrder: Number(body.sortOrder) || 0,
      isFeatured: !!body.isFeatured,
      ctaLabel: String(body.ctaLabel || 'Suscribir'),
    }

    const saved = await db.planOverride.upsert({
      where: { planId },
      create: data,
      update: data,
    })

    return NextResponse.json({ success: true, data: saved })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'No se pudo guardar el plan: ' + (e as Error).message },
      { status: 500 }
    )
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
