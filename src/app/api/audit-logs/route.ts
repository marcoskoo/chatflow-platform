import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const take = parseInt(searchParams.get('take') || '100', 10)
    const resource = searchParams.get('resource')
    const logs = await db.auditLog.findMany({
      where: resource ? { resource } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 1000),
    })
    return NextResponse.json({ success: true, data: logs })
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
    const log = await db.auditLog.create({
      data: {
        actor: body.actor || 'system',
        action: body.action,
        resource: body.resource,
        resourceId: body.resourceId || null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
        ipAddress: body.ipAddress || null,
        userAgent: body.userAgent || null,
      },
    })
    return NextResponse.json({ success: true, data: log })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
