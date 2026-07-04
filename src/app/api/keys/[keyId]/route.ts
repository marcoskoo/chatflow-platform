import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// DELETE /api/keys/[keyId] - Revoke/delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const { keyId } = await params

    const existing = await db.apiKey.findUnique({ where: { id: keyId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      )
    }

    await db.apiKey.delete({ where: { id: keyId } })

    return NextResponse.json({
      success: true,
      message: `API key "${existing.name}" revoked successfully`,
    })
  } catch (error) {
    console.error('API Key deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}

// PATCH /api/keys/[keyId] - Update API key (toggle active, change permissions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const { keyId } = await params
    const body = await request.json()
    const { name, permissions, isActive } = body

    const existing = await db.apiKey.findUnique({ where: { id: keyId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions)
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.apiKey.update({
      where: { id: keyId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        permissions: JSON.parse(updated.permissions),
        isActive: updated.isActive,
        lastUsedAt: updated.lastUsedAt,
      },
    })
  } catch (error) {
    console.error('API Key update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update API key' },
      { status: 500 }
    )
  }
}
