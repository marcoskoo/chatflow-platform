import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const updated = await db.knowledgeBase.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    await db.knowledgeBase.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Search endpoint: GET /api/knowledge-base/[id]?q=text
 * Returns matching chunks for RAG.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const item = await db.knowledgeBase.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (!q) return NextResponse.json({ success: true, data: item })

    // Simple BM25-like scoring: count keyword occurrences
    const keywords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const content = item.content.toLowerCase()
    const score = keywords.reduce((acc, kw) => acc + (content.split(kw).length - 1), 0)
    return NextResponse.json({
      success: true,
      data: { ...item, relevanceScore: score },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
