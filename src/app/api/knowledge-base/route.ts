import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get('botId')
    const items = await db.knowledgeBase.findMany({
      where: botId ? { botId } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: items })
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
    // In production, generate embeddings via OpenAI/Voyage AI here.
    // For now we store the content as-is and rely on BM25-like keyword matching.
    const created = await db.knowledgeBase.create({
      data: {
        botId: body.botId,
        title: body.title,
        content: body.content,
        source: body.source || 'manual',
        sourceUrl: body.sourceUrl || null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, data: created })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
