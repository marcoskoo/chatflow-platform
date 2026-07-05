import { NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi-spec'

export const runtime = 'nodejs'

/**
 * GET /api/docs/json
 *
 * Returns the OpenAPI 3.1 spec as JSON. Public endpoint (no auth required).
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
