import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import crypto from 'crypto'

// ─── API Key Authentication ───────────────────────────────────────────────────

export interface ApiKeyData {
  id: string
  name: string
  key: string
  permissions: string[]
  isActive: boolean
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
 * Middleware wrapper that requires API key authentication.
 * Usage in route handlers:
 *   export async function GET(request: NextRequest) {
 *     const auth = await requireAuth(request)
 *     if (!auth.success) return auth.response
 *     const apiKey = auth.apiKey!
 *     // ... proceed with handler
 *   }
 */
export async function requireAuth(request: NextRequest, requiredPermission: string = 'read') {
  const apiKey = await validateApiKey(request)

  if (!apiKey) {
    return {
      success: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'Include an API key via Authorization: Bearer <key> or x-api-key header',
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

  return { success: true as const, apiKey }
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
