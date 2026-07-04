import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/conversations - List all conversations
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const botId = searchParams.get('botId')

    const where: Record<string, unknown> = {}
    if (channel) where.channel = channel
    if (status) where.status = status
    if (botId) where.botId = botId

    const conversations = await db.conversation.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        tags: true,
        notes: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: conversations })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { botId, channel, contactName, contactAvatar } = body

    if (!botId || !channel || !contactName) {
      return NextResponse.json(
        { success: false, error: 'botId, channel, and contactName are required' },
        { status: 400 }
      )
    }

    const conversation = await db.conversation.create({
      data: {
        botId,
        channel,
        contactName,
        contactAvatar: contactAvatar || null,
        status: 'active',
        unread: 0,
      },
    })

    return NextResponse.json({ success: true, data: conversation }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
