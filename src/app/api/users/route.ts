import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const users = await db.user.findMany({ include: { role: true } })
    // Strip sensitive fields
    const safe = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      roleId: u.roleId,
      roleName: u.role?.name,
      ssoProvider: u.ssoProvider,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }))
    return NextResponse.json({ success: true, data: safe })
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
    const created = await db.user.create({
      data: {
        email: body.email,
        name: body.name,
        roleId: body.roleId || null,
        ssoProvider: body.ssoProvider || null,
        ssoId: body.ssoId || null,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json({ success: true, data: { id: created.id, email: created.email } })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
