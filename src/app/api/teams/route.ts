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
