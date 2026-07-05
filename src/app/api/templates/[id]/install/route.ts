/**
 * Install a marketplace template: clone its flowData into a new bot/flow.
 * POST /api/templates/[id]/install  body: { botName, channels? }
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
    const body = await req.json()
    const template = await db.template.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })

    const bot = await db.bot.create({
      data: {
        name: body.botName || template.name,
        description: template.description,
        status: 'draft',
        channels: body.channels ? body.channels.join(',') : '',
      },
    })

    const flowData = JSON.parse(template.flowData || '{}') as { nodes?: unknown[]; edges?: unknown[] }
    const flow = await db.flow.create({
      data: {
        name: `${template.name} - Main`,
        botId: bot.id,
        nodes: JSON.stringify(flowData.nodes || []),
        edges: JSON.stringify(flowData.edges || []),
        trigger: '{}',
        isActive: true,
      },
    })

    await db.template.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    })

    return NextResponse.json({ success: true, data: { bot, flow } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
