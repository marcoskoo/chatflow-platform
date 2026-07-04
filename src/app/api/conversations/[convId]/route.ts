import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/conversations/[convId] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const { convId } = await params
    const conversation = await db.conversation.findUnique({
      where: { id: convId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        tags: true,
        notes: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[convId] - Update conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { convId } = await params
    const body = await request.json()
    const { status, assignedTo, team } = body

    const conversation = await db.conversation.update({
      where: { id: convId },
      data: {
        ...(status && { status }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(team !== undefined && { team }),
      },
    })

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
