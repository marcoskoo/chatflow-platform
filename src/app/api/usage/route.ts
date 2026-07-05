import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}
    if (from || to) {
      where.periodStart = {}
      if (from) (where.periodStart as Record<string, unknown>).gte = new Date(from)
      if (to) (where.periodStart as Record<string, unknown>).lte = new Date(to)
    }

    const records = await db.usageRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 })

    // Aggregate by metric
    const agg: Record<string, number> = {}
    for (const r of records) {
      agg[r.metric] = (agg[r.metric] || 0) + r.count
    }

    return NextResponse.json({ success: true, data: { records, aggregated: agg } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
