import { NextResponse } from 'next/server'

// Simple health check endpoint used by Vercel/uptime monitors
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'chatflow-platform',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    glm: process.env.GLM_API_KEY ? 'configured' : 'optional',
  })
}
