import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const items = await db.aBTest.findMany({
      orderBy: { createdAt: 'desc' },
    })
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
    const created = await db.aBTest.create({
      data: {
        name: body.name,
        botId: body.botId,
        flowIdA: body.flowIdA,
        flowIdB: body.flowIdB || null,
        trafficSplit: body.trafficSplit ?? 50,
        status: body.status || 'running',
        metricGoal: body.metricGoal || 'conversion',
      },
    })
    return NextResponse.json({ success: true, data: created })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
