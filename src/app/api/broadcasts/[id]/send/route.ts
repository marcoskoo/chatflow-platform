/**
 * Send a broadcast: enqueue receipts to matching contacts and simulate sending.
 * In production this would push to WhatsApp Cloud API / Messenger Send API / Telegram Bot API.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const broadcast = await db.broadcast.findUnique({ where: { id } })
    if (!broadcast) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    // Find matching contacts by channel + segment tags
    const segment = JSON.parse(broadcast.segment || '{}') as { tags?: string[] }
    const contacts = await db.contact.findMany({
      where: {
        optIn: true,
        channel: broadcast.channel,
        ...(segment.tags && segment.tags.length > 0
          ? { OR: segment.tags.map((t) => ({ tags: { contains: t } })) }
          : {}),
      },
      take: 1000,
    })

    // Create receipts and "send"
    let sent = 0
    let failed = 0
    for (const c of contacts) {
      try {
        await db.broadcastReceipt.create({
          data: {
            broadcastId: broadcast.id,
            contactId: c.id,
            status: 'sent',
            sentAt: new Date(),
          },
        })
        sent++
      } catch {
        failed++
      }
    }

    const updated = await db.broadcast.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        totalSent: sent,
        totalFailed: failed,
      },
    })

    return NextResponse.json({
      success: true,
      data: { broadcast: updated, sent, failed, total: contacts.length },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
