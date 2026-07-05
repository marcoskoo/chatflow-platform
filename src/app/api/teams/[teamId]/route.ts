import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// PATCH /api/teams/[teamId] - Update a team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { teamId } = await params
    const body = await request.json()
    const { name, description, members, color } = body

    const existing = await db.team.findUnique({ where: { id: teamId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    const updated = await db.team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(members !== undefined && { members: JSON.stringify(members) }),
        ...(color !== undefined && { color }),
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...updated, members: JSON.parse(updated.members) },
    })
  } catch (error) {
    console.error('Team update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[teamId] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const { teamId } = await params
    await db.team.delete({ where: { id: teamId } })
    return NextResponse.json({ success: true, message: 'Team deleted' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete team' },
      { status: 500 }
    )
  }
}
