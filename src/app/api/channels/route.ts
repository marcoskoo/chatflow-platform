import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/channels - List all channels
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'read')
  if (!auth.success) return auth.response

  try {
    const channels = await db.channel.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}
