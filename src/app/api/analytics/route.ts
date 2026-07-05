/**
 * Analytics API: aggregates metrics across bots, channels, conversations, flows.
 * GET /api/analytics?from=ISO&to=ISO&botId=...
 *
 * Returns:
 *  - totalConversations, totalMessages, activeBots, csatAvg
 *  - conversationsByChannel: { whatsapp: n, messenger: n, ... }
 *  - conversationsByBot: [{ botId, name, count }]
 *  - messagesOverTime: [{ date, count }]
 *  - csatDistribution: { 1: n, 2: n, ... 5: n }
 *  - slaBreaches: number
 *  - botHandoffs: number
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ? new Date(searchParams.get('from') as string) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : undefined
    const botId = searchParams.get('botId')

    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) (dateFilter.createdAt as Record<string, unknown>).gte = from
      if (to) (dateFilter.createdAt as Record<string, unknown>).lte = to
    }

    const [
      totalConversations,
      totalMessages,
      activeBots,
      csatRows,
      channelRows,
      botRows,
      slaBreaches,
      handoffs,
      recentMessages,
    ] = await Promise.all([
      db.conversation.count({ where: { ...dateFilter, ...(botId ? { botId } : {}) } }),
      db.message.count({ where: dateFilter }),
      db.bot.count({ where: { status: 'active' } }),
      db.conversation.findMany({
        where: { csatScore: { not: null } },
        select: { csatScore: true },
      }),
      db.conversation.groupBy({
        by: ['channel'],
        where: { ...dateFilter, ...(botId ? { botId } : {}) },
        _count: { _all: true },
      }),
      db.conversation.groupBy({
        by: ['botId'],
        where: { ...dateFilter, ...(botId ? { botId } : {}) },
        _count: { _all: true },
      }),
      db.conversationEvent.count({ where: { type: 'sla_breach' } }),
      db.conversationEvent.count({ where: { type: 'bot_handoff' } }),
      db.message.findMany({
        where: dateFilter,
        select: { createdAt: true },
        take: 5000,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const csatAvg =
      csatRows.length > 0
        ? csatRows.reduce((s, r) => s + (r.csatScore || 0), 0) / csatRows.length
        : 0
    const csatDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of csatRows) {
      const s = r.csatScore || 0
      if (s >= 1 && s <= 5) csatDistribution[s]++
    }

    const conversationsByChannel: Record<string, number> = {}
    for (const r of channelRows) conversationsByChannel[r.channel] = r._count._all

    const conversationsByBot = await Promise.all(
      botRows.map(async (r) => {
        const bot = await db.bot.findUnique({ where: { id: r.botId || '' } })
        return { botId: r.botId, name: bot?.name || 'Unknown', count: r._count._all }
      })
    )

    // Aggregate messages per day
    const messagesOverTime: Array<{ date: string; count: number }> = []
    const byDay: Record<string, number> = {}
    for (const m of recentMessages) {
      const d = m.createdAt.toISOString().slice(0, 10)
      byDay[d] = (byDay[d] || 0) + 1
    }
    for (const [date, count] of Object.entries(byDay)) {
      messagesOverTime.push({ date, count })
    }
    messagesOverTime.sort((a, b) => (a.date < b.date ? -1 : 1))

    return NextResponse.json({
      success: true,
      data: {
        totalConversations,
        totalMessages,
        activeBots,
        csatAvg: Math.round(csatAvg * 100) / 100,
        conversationsByChannel,
        conversationsByBot,
        messagesOverTime,
        csatDistribution,
        slaBreaches,
        botHandoffs: handoffs,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
