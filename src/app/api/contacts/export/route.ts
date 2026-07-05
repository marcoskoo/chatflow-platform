import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const contacts = await db.contact.findMany({ take: 10000 })
    const headers = ['id', 'name', 'email', 'phone', 'channel', 'language', 'tags', 'optIn', 'createdAt']
    const rows = contacts.map((c) =>
      headers.map((h) => {
        const v = (c as unknown as Record<string, unknown>)[h]
        if (h === 'tags') return JSON.stringify(JSON.parse((v as string) || '[]'))
        return v ?? ''
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="contacts.csv"',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
