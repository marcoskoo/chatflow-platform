import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const items = await db.subscription.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const sub = await db.subscription.create({
      data: {
        customerId: body.customerId,
        plan: body.plan || 'free',
        status: body.status || 'active',
        seats: body.seats ?? 1,
        conversationsLimit: body.conversationsLimit ?? 1000,
        messagesLimit: body.messagesLimit ?? 10000,
        stripeSubscriptionId: body.stripeSubscriptionId || null,
        currentPeriodStart: body.currentPeriodStart ? new Date(body.currentPeriodStart) : null,
        currentPeriodEnd: body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : null,
      },
    })
    return NextResponse.json({ success: true, data: sub })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
