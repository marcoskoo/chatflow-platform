import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import crypto from 'crypto'
import { verifySession, getSessionCookieName, type SessionPayload } from './session'

// ─── API Key Authentication ───────────────────────────────────────────────────

export interface ApiKeyData {
  id: string
  name: string
  key: string
  permissions: string[]
  isActive: boolean
}

// ─── Session (logged-in user) Authentication ─────────────────────────────────

export interface UserData {
  id: string
  email: string
  name: string
  roleId: string | null
  permissions: string[]   // derived from Role, default ['admin'] if no role
  isActive: boolean
}

/**
 * Validate session cookie (JWT). Returns UserData if valid, or null.
 * Looks for cookie named `chatflow_session`.
 */
export async function validateSession(request: NextRequest): Promise<UserData | null> {
  const cookieName = getSessionCookieName()
  const cookie = request.cookies.get(cookieName)?.value
  const payload = verifySession(cookie)
  if (!payload) return null

  // Look up the user to make sure they still exist and are active
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  })
  if (!user || !user.isActive) return null

  // Derive permissions from role (or default to admin for backward compat)
  let permissions: string[]
  if (user.role) {
    try { permissions = JSON.parse(user.role.permissions) } catch { permissions = ['read'] }
  } else {
    // No role assigned → treat as admin (matches existing single-admin behavior)
    permissions = ['admin', 'read', 'write', 'webhooks']
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    permissions,
    isActive: user.isActive,
  }
}

/**
 * Build a session payload for a user (used by /api/auth/login and /api/auth/register).
 */
export function buildSessionPayload(user: { id: string; email: string; name: string }) {
  return { sub: user.id, email: user.email, name: user.name }
}

/**
 * Validate API key from request headers.
 * Looks for:
 *   - Authorization: Bearer <key>
 *   - x-api-key: <key>
 * Returns the API key data if valid, or null if invalid/missing.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyData | null> {
  const authHeader = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')

  let rawKey: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.substring(7).trim()
  } else if (xApiKey) {
    rawKey = xApiKey.trim()
  }

  if (!rawKey) return null

  // Hash the key to compare (keys are stored hashed)
  const hashedKey = hashApiKey(rawKey)

  const apiKey = await db.apiKey.findFirst({
    where: { key: hashedKey, isActive: true },
  })

  if (!apiKey) return null

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: apiKey.key,
    permissions: JSON.parse(apiKey.permissions),
    isActive: apiKey.isActive,
  }
}

/**
 * Check if the API key has the required permission.
 */
export function hasPermission(apiKey: ApiKeyData, permission: string): boolean {
  return apiKey.permissions.includes('admin') || apiKey.permissions.includes(permission)
}

/**
 * Middleware wrapper that requires authentication.
 * Accepts EITHER:
 *   - API key via `Authorization: Bearer <key>` or `x-api-key: <key>` header, OR
 *   - Session cookie `chatflow_session` (JWT, set by /api/auth/login)
 * Usage in route handlers:
 *   export async function GET(request: NextRequest) {
 *     const auth = await requireAuth(request)
 *     if (!auth.success) return auth.response
 *     const apiKey = auth.apiKey    // present if authed via API key
 *     const user = auth.user        // present if authed via session cookie
 *     // ... proceed with handler
 *   }
 */
export async function requireAuth(request: NextRequest, requiredPermission: string = 'read') {
  // Try session cookie first (logged-in user)
  const user = await validateSession(request)
  if (user) {
    if (!user.permissions.includes('admin') && !user.permissions.includes(requiredPermission)) {
      return {
        success: false as const,
        response: NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            message: `This endpoint requires '${requiredPermission}' permission`,
          },
          { status: 403 }
        ),
      }
    }
    return { success: true as const, apiKey: null, user }
  }

  // Fall back to API key
  const apiKey = await validateApiKey(request)

  if (!apiKey) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'Log in via /api/auth/login (sets a session cookie) or include an API key via Authorization: Bearer <key> or x-api-key header',
        },
        { status: 401 }
      ),
    }
  }

  if (!hasPermission(apiKey, requiredPermission)) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          message: `This endpoint requires '${requiredPermission}' permission`,
        },
        { status: 403 }
      ),
    }
  }

  return { success: true as const, apiKey, user: null }
}

/**
 * Require a logged-in user (session cookie). Does NOT accept API keys.
 * Use this for endpoints that need a real User row (e.g. user profile, billing).
 */
export type RequireUserResult =
  | { success: true; user: UserData }
  | { success: false; response: NextResponse }

export async function requireUser(request: NextRequest): Promise<RequireUserResult> {
  const user = await validateSession(request)
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required', message: 'Log in via /api/auth/login' },
        { status: 401 }
      ),
    }
  }
  return { success: true, user }
}

// ─── API Key Generation ───────────────────────────────────────────────────────

const API_KEY_PREFIX = 'cf_' // ChatFlow prefix

/**
 * Generate a new API key string (e.g., cf_a1b2c3d4e5f6...)
 */
export function generateApiKeyString(): string {
  const bytes = crypto.randomBytes(32)
  return API_KEY_PREFIX + bytes.toString('hex')
}

/**
 * Hash an API key for storage using SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Verify Facebook/Meta webhook signature (HMAC-SHA1)
 * Used for WhatsApp, Messenger, and Instagram webhooks.
 */
export function verifyMetaSignature(
  appSecret: string,
  payload: string,
  signature: string
): boolean {
  const expectedHash = crypto
    .createHmac('sha1', appSecret)
    .update(payload)
    .digest('hex')
  const expectedSignature = `sha1=${expectedHash}`

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Verify Telegram webhook signature (HMAC-SHA256 of the secret token)
 */
export function verifyTelegramSignature(
  botToken: string,
  payload: string,
  signature?: string
): boolean {
  if (!signature) return true // Telegram doesn't always send a secret_header
  const secret = crypto.createHash('sha256').update(botToken).digest()
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedHash)
    )
  } catch {
    return false
  }
}

/**
 * Get webhook config for a specific channel from database
 */
export async function getWebhookConfig(channel: string) {
  return db.webhookConfig.findUnique({
    where: { channel },
  })
}
