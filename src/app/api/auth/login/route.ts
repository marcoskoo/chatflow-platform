import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signSession, getSessionCookieName, getSessionTtl } from '@/lib/session'
import { buildSessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// POST /api/auth/login
// Body: { email, password }
// Sets a `chatflow_session` cookie (httpOnly, 7 days) and returns the user object.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body.email ?? '').toString().trim().toLowerCase()
    const password = (body.password ?? '').toString()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { email }, include: { role: true } })
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash)
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Build JWT session token and set as httpOnly cookie
    const token = signSession(buildSessionPayload(user))
    const cookieName = getSessionCookieName()
    const ttl = getSessionTtl()

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        roleName: user.role?.name ?? null,
        lastLoginAt: new Date().toISOString(),
      },
    })
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ttl,
    })
    return response
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}
