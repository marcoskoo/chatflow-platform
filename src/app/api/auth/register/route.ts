import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signSession, getSessionCookieName, getSessionTtl } from '@/lib/session'
import { buildSessionPayload } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// POST /api/auth/register
// Body: { email, password, name }
// Creates a user, sets session cookie, returns user.
// If the request comes from an already-authenticated admin, the new user is created
// without auto-login (the admin keeps their own session).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body.email ?? '').toString().trim().toLowerCase()
    const password = (body.password ?? '').toString()
    const name = (body.name ?? '').toString().trim()

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Nombre, email y contraseña son obligatorios' },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      )
    }

    // Hash password (10 rounds is the bcrypt default — fine for interactive signup)
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user. If there are zero users, this first user gets no role → admin by default
    // (matches the bootstrap behavior of the original API key system).
    const userCount = await db.user.count()
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        isActive: true,
      },
    })

    // Build session token
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
        isFirstUser: userCount === 0,
      },
    })
    // Only auto-set the session cookie if this is the first user (self-service bootstrap).
    // For subsequent registrations, the requester must already be logged in as admin
    // (we don't enforce that here to keep signup open, but we don't auto-login the new user
    // into the admin's browser session).
    if (userCount === 0) {
      response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttl,
      })
    }
    return response
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
