/**
 * Contacts API - CRM with multi-channel unified profile
 * GET    /api/contacts           - list with filters (q, tag, channel, language)
 * POST   /api/contacts           - create
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const tag = searchParams.get('tag')
    const channel = searchParams.get('channel')
    const language = searchParams.get('language')

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (channel) where.channel = channel
    if (language) where.language = language
    if (tag) where.tags = { contains: tag }

    const contacts = await db.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ success: true, data: contacts })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const contact = await db.contact.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        externalId: body.externalId,
        channel: body.channel,
        avatar: body.avatar,
        language: body.language || 'es',
        attributes: body.attributes ? JSON.stringify(body.attributes) : '{}',
        tags: body.tags ? JSON.stringify(body.tags) : '[]',
        optIn: body.optIn ?? true,
      },
    })
    return NextResponse.json({ success: true, data: contact })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
