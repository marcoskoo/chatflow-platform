import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const broadcasts = await db.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ success: true, data: broadcasts })
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
    const broadcast = await db.broadcast.create({
      data: {
        name: body.name,
        botId: body.botId || null,
        channel: body.channel || 'whatsapp',
        segment: body.segment ? JSON.stringify(body.segment) : '{}',
        message: body.message || '',
        messageType: body.messageType || 'text',
        templateName: body.templateName || null,
        templateParams: body.templateParams ? JSON.stringify(body.templateParams) : null,
        status: body.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    })
    return NextResponse.json({ success: true, data: broadcast })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
