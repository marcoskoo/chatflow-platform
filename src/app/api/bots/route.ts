import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/bots - List all bots (requires 'read' permission)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const bots = await db.bot.findMany({
      include: { flows: true },
      orderBy: { createdAt: 'desc' },
    })
    const formatted = bots.map(b => ({
      ...b,
      channels: JSON.parse(b.channels),
      flows: b.flows.map(f => ({
        ...f,
        nodes: JSON.parse(f.nodes),
        edges: JSON.parse(f.edges),
        trigger: JSON.parse(f.trigger),
      })),
    }))
    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bots' },
      { status: 500 }
    )
  }
}

// POST /api/bots - Create a new bot (requires 'write' permission)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { name, description, channels } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const bot = await db.bot.create({
      data: {
        name,
        description: description || null,
        channels: channels ? JSON.stringify(channels) : '[]',
        status: 'draft',
      },
    })

    return NextResponse.json({ success: true, data: bot }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create bot' },
      { status: 500 }
    )
  }
}
