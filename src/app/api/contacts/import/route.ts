import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const contacts = body.contacts as Array<Record<string, unknown>>
    if (!Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: 'contacts must be an array' }, { status: 400 })
    }
    const result = await db.$transaction(
      contacts.map((c) =>
        db.contact.create({
          data: {
            name: (c.name as string) || null,
            email: (c.email as string) || null,
            phone: (c.phone as string) || null,
            channel: (c.channel as string) || null,
            language: (c.language as string) || 'es',
            attributes: c.attributes ? JSON.stringify(c.attributes) : '{}',
            tags: c.tags ? JSON.stringify(c.tags) : '[]',
          },
        })
      )
    )
    return NextResponse.json({ success: true, data: { imported: result.length } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
