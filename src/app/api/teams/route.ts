import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/teams - List all teams
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const teams = await db.team.findMany({
      orderBy: { createdAt: 'desc' },
    })
    const formatted = teams.map(t => ({
      ...t,
      members: JSON.parse(t.members),
    }))
    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { name, description, members, color } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const team = await db.team.create({
      data: {
        name,
        description: description || null,
        members: JSON.stringify(members || []),
        color: color || '#10b981',
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...team, members: JSON.parse(team.members) },
    }, { status: 201 })
  } catch (error) {
    console.error('Team creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    )
  }
}
