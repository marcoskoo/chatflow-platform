import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/bots/[botId] - Get a specific bot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const { botId } = await params
    const bot = await db.bot.findUnique({
      where: { id: botId },
      include: { flows: true },
    })
    if (!bot) {
      return NextResponse.json(
        { success: false, error: 'Bot not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({
      success: true,
      data: {
        ...bot,
        channels: JSON.parse(bot.channels),
        flows: bot.flows.map(f => ({
          ...f,
          nodes: JSON.parse(f.nodes),
          edges: JSON.parse(f.edges),
          trigger: JSON.parse(f.trigger),
        })),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot' },
      { status: 500 }
    )
  }
}

// PATCH /api/bots/[botId] - Update a bot
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { botId } = await params
    const body = await request.json()
    const { name, description, status, channels } = body

    const bot = await db.bot.update({
      where: { id: botId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(channels && { channels: JSON.stringify(channels) }),
      },
    })

    return NextResponse.json({ success: true, data: bot })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update bot' },
      { status: 500 }
    )
  }
}

// DELETE /api/bots/[botId] - Delete a bot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const { botId } = await params
    await db.bot.delete({ where: { id: botId } })
    return NextResponse.json({ success: true, message: 'Bot deleted' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete bot' },
      { status: 500 }
    )
  }
}
