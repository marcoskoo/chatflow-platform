import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// PATCH /api/flows/[flowId] - Update an existing flow (nodes, edges, trigger, name, isActive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { flowId } = await params
    const body = await request.json()
    const { name, nodes, edges, trigger, isActive } = body

    // Verify the flow exists
    const existing = await db.flow.findUnique({ where: { id: flowId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Flow not found' },
        { status: 404 }
      )
    }

    // Build update payload — only include fields that were provided
    const data: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (Array.isArray(nodes)) data.nodes = JSON.stringify(nodes)
    if (Array.isArray(edges)) data.edges = JSON.stringify(edges)
    if (trigger !== undefined) {
      // Accept object or string; store as string
      data.trigger = typeof trigger === 'string' ? trigger : JSON.stringify(trigger ?? {})
    }
    if (typeof isActive === 'boolean') data.isActive = isActive

    // If nothing to update, return current flow
    if (Object.keys(data).length === 0) {
      const fresh = await db.flow.findUnique({ where: { id: flowId } })
      return NextResponse.json({
        success: true,
        data: fresh ? {
          ...fresh,
          nodes: JSON.parse(fresh.nodes),
          edges: JSON.parse(fresh.edges),
          trigger: JSON.parse(fresh.trigger),
        } : null,
      })
    }

    const updated = await db.flow.update({
      where: { id: flowId },
      data,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        nodes: JSON.parse(updated.nodes),
        edges: JSON.parse(updated.edges),
        trigger: JSON.parse(updated.trigger),
      },
    })
  } catch (error) {
    console.error('PATCH /api/flows/[flowId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update flow' },
      { status: 500 }
    )
  }
}

// GET /api/flows/[flowId] - Fetch a single flow with parsed JSON fields
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const { flowId } = await params
    const flow = await db.flow.findUnique({ where: { id: flowId } })
    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Flow not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({
      success: true,
      data: {
        ...flow,
        nodes: JSON.parse(flow.nodes),
        edges: JSON.parse(flow.edges),
        trigger: JSON.parse(flow.trigger),
      },
    })
  } catch (error) {
    console.error('GET /api/flows/[flowId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flow' },
      { status: 500 }
    )
  }
}
