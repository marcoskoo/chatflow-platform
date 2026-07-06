import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST /api/auth/seed
// Idempotent: if zero users exist, create the initial admin user.
// Body (optional): { email?, password?, name? }
// Defaults: admin@chatflow.pe / admin123 / "Administrador"
// Returns { success, created: bool, email, password? (only if created) }
export async function POST(request: NextRequest) {
  try {
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json({
        success: true,
        created: false,
        message: 'Ya existen usuarios en el sistema. No se creó ninguno nuevo.',
      })
    }

    let body: { email?: string; password?: string; name?: string } = {}
    try { body = await request.json() } catch { /* empty body is fine */ }

    const email = (body.email ?? 'admin@chatflow.pe').toString().trim().toLowerCase()
    const password = (body.password ?? 'admin123').toString()
    const name = (body.name ?? 'Administrador').toString().trim()

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: { email, name, passwordHash, isActive: true },
    })

    return NextResponse.json({
      success: true,
      created: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        // We expose the plaintext password ONLY here, since this is the one-time
        // bootstrap. The user should change it immediately.
        password,
      },
    })
  } catch (error) {
    console.error('POST /api/auth/seed error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario admin inicial' },
      { status: 500 }
    )
  }
}

// GET /api/auth/seed  → returns whether any user exists yet
export async function GET(request: NextRequest) {
  const userCount = await db.user.count()
  return NextResponse.json({
    success: true,
    data: {
      hasUsers: userCount > 0,
      userCount,
    },
  })
}
