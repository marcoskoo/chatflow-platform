import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const items = await db.dataRequest.findMany({ orderBy: { createdAt: 'desc' } })
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
    const req_ = await db.dataRequest.create({
      data: {
        type: body.type, // 'export' | 'delete'
        contactId: body.contactId || null,
        email: body.email || null,
        requestedBy: body.requestedBy || 'admin',
        status: 'processing',
      },
    })

    if (body.type === 'export' && body.contactId) {
      // Export all data for this contact
      const contact = await db.contact.findUnique({
        where: { id: body.contactId },
        include: {
          conversations: { include: { messages: true, tags: true, notes: true } },
        },
      })
      if (contact) {
        const blob = JSON.stringify(contact, null, 2)
        await db.dataRequest.update({
          where: { id: req_.id },
          data: {
            status: 'completed',
            resultUrl: `data:application/json;base64,${Buffer.from(blob).toString('base64')}`,
            completedAt: new Date(),
          },
        })
      }
    } else if (body.type === 'delete' && body.contactId) {
      // Right to be forgotten: anonymize and delete
      await db.contact.delete({ where: { id: body.contactId } })
      await db.dataRequest.update({
        where: { id: req_.id },
        data: { status: 'completed', completedAt: new Date() },
      })
    }

    const final = await db.dataRequest.findUnique({ where: { id: req_.id } })
    return NextResponse.json({ success: true, data: final })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
