import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

// GET /api/auth/me
// Returns the currently logged-in user (from session cookie), or 401 if not logged in.
export async function GET(request: NextRequest) {
  const user = await validateSession(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    )
  }
  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      permissions: user.permissions,
    },
  })
}
