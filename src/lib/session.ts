import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// ─── JWT-like session token (HS256, no external deps) ───────────────────────
// Token format: base64url(header).base64url(payload).base64url(signature)
// Cookie name: chatflow_session
// TTL: 7 days

const COOKIE_NAME = 'chatflow_session'
const TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function getSecret(): string {
  // Prefer env var; fall back to a stable dev secret (with a warning)
  const env = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (env && env.length >= 16) return env
  console.warn('[session] WARNING: JWT_SECRET env var not set or too short. Using insecure dev fallback. Set JWT_SECRET in production.')
  return 'chatflow-dev-secret-DO-NOT-USE-IN-PROD-9f3a8b7c2e1d'
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): Buffer {
  const pad = '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export interface SessionPayload {
  sub: string       // user id
  email: string
  name: string
  iat: number       // issued at (epoch seconds)
  exp: number       // expiry (epoch seconds)
}

export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000)
  const full: SessionPayload = { ...payload, iat: now, exp: now + TTL_SECONDS }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(full))
  const data = `${encHeader}.${encPayload}`
  const sig = createHmac('sha256', getSecret()).update(data).digest()
  const encSig = base64url(sig)
  return `${data}.${encSig}`
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encHeader, encPayload, encSig] = parts
  const data = `${encHeader}.${encPayload}`
  const expectedSig = createHmac('sha256', getSecret()).update(data).digest()
  const providedSig = base64urlDecode(encSig)
  // Constant-time compare
  if (expectedSig.length !== providedSig.length) return null
  if (!timingSafeEqual(expectedSig, providedSig)) return null
  try {
    const payload = JSON.parse(base64urlDecode(encPayload).toString('utf8')) as SessionPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME
}

export function getSessionTtl(): number {
  return TTL_SECONDS
}

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
