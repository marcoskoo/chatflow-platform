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
    const t = await db.aBTest.findUnique({ where: { id } })
    if (!t) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    const aConvRate = t.variantAVisitors > 0 ? t.variantAConversions / t.variantAVisitors : 0
    const bConvRate = t.variantBVisitors > 0 ? t.variantBConversions / t.variantBVisitors : 0
    const winner = aConvRate > bConvRate ? 'A' : bConvRate > aConvRate ? 'B' : null
    return NextResponse.json({ success: true, data: { ...t, aConvRate, bConvRate, computedWinner: winner } })
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
    const updated = await db.aBTest.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.winner !== undefined && { winner: body.winner }),
        ...(body.trafficSplit !== undefined && { trafficSplit: body.trafficSplit }),
        ...(body.endedAt !== undefined && { endedAt: body.endedAt ? new Date(body.endedAt) : null }),
        ...(body.variantAConversions !== undefined && { variantAConversions: body.variantAConversions }),
        ...(body.variantAVisitors !== undefined && { variantAVisitors: body.variantAVisitors }),
        ...(body.variantBConversions !== undefined && { variantBConversions: body.variantBConversions }),
        ...(body.variantBVisitors !== undefined && { variantBVisitors: body.variantBVisitors }),
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
    await db.aBTest.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
