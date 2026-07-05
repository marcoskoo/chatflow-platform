import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton.
 *
 * - In production (Vercel serverless), we instantiate a fresh client per cold start.
 *   `datasourceUrl` is set explicitly so Prisma uses the runtime env var injected by Vercel
 *   (not the build-time .env value), which is critical for Vercel Postgres / Neon / Supabase.
 * - In development, we cache the client on `globalThis` to avoid exhausting DB connections
 *   during Next.js fast refresh.
 */
function createPrismaClient() {
  const datasourceUrl = process.env.DATABASE_URL
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
