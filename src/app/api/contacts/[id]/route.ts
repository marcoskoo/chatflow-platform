import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        conversations: { orderBy: { updatedAt: 'desc' }, take: 20 },
      },
    })
    if (!contact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: contact })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const updated = await db.contact.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
        ...(body.language !== undefined && { language: body.language }),
        ...(body.optIn !== undefined && { optIn: body.optIn }),
        ...(body.attributes !== undefined && { attributes: JSON.stringify(body.attributes) }),
        ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
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
    await db.contact.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
