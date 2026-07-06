import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookieName } from '@/lib/session'

// POST /api/auth/logout
// Clears the session cookie.
export async function POST(request: NextRequest) {
  const cookieName = getSessionCookieName()
  const response = NextResponse.json({ success: true })
  response.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,  // expire immediately
  })
  return response
}
