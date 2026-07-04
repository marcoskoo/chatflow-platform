import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/conversations/[convId]/messages - List messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const { convId } = await params
    const messages = await db.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[convId]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { convId } = await params
    const body = await request.json()
    const { sender, content, type, buttons, attachments, isBot } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const message = await db.message.create({
      data: {
        conversationId: convId,
        sender: sender || 'user',
        content,
        type: type || 'text',
        buttons: buttons ? JSON.stringify(buttons) : null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        isBot: isBot ?? false,
      },
    })

    await db.conversation.update({
      where: { id: convId },
      data: {
        lastMessage: content.substring(0, 100),
        updatedAt: new Date(),
        ...(sender === 'user' ? { unread: { increment: 1 } } : {}),
      },
    })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
