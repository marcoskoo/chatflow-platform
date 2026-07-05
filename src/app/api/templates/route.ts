import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const items = await db.template.findMany({
      where: {
        isPublic: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { downloads: 'desc' }],
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
    const created = await db.template.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        industry: body.industry || null,
        flowData: body.flowData ? JSON.stringify(body.flowData) : '{}',
        preview: body.preview || null,
        author: body.author || 'ChatFlow',
        isPublic: body.isPublic ?? true,
        isFeatured: body.isFeatured ?? false,
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
