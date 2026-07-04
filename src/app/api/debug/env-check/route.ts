import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL
  
  return NextResponse.json({
    DATABASE_URL_set: !!dbUrl,
    DATABASE_URL_prefix: dbUrl ? dbUrl.substring(0, 30) + '...' : 'NOT SET',
    DIRECT_URL_set: !!directUrl,
    DIRECT_URL_prefix: directUrl ? directUrl.substring(0, 30) + '...' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
}
