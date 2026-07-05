import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const items = await db.outgoingWebhook.findMany({ orderBy: { createdAt: 'desc' } })
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
    const created = await db.outgoingWebhook.create({
      data: {
        name: body.name,
        url: body.url,
        method: body.method || 'POST',
        headers: body.headers ? JSON.stringify(body.headers) : '{}',
        bodyTemplate: body.bodyTemplate ? JSON.stringify(body.bodyTemplate) : '{}',
        events: body.events ? JSON.stringify(body.events) : '[]',
        isActive: body.isActive ?? true,
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
