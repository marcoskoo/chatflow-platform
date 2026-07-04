import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKeyString, hashApiKey, requireAuth } from '@/lib/auth'

// GET /api/keys - List all API keys (masked)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      permissions: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: keys.map(k => ({
      ...k,
      permissions: JSON.parse(k.permissions),
    })),
  })
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { name, permissions } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const rawKey = generateApiKeyString()
    const hashedKey = hashApiKey(rawKey)
    const perms = permissions || ['read', 'write']

    const apiKey = await db.apiKey.create({
      data: {
        name,
        key: hashedKey,
        permissions: JSON.stringify(perms),
        isActive: true,
      },
    })

    // Return the raw key ONLY on creation - it cannot be retrieved later
    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Raw key - save this, it won't be shown again
        permissions: perms,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
      },
      warning: 'Guarda esta API key de forma segura. No se podrá volver a mostrar.',
    }, { status: 201 })
  } catch (error) {
    console.error('API Key creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
