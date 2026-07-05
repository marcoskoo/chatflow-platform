import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    const items = await db.voiceBot.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const body = await req.json()
    const created = await db.voiceBot.create({
      data: {
        name: body.name,
        provider: body.provider || 'twilio',
        phoneNumber: body.phoneNumber || null,
        voice: body.voice || 'Polly.Lucia-Neural',
        language: body.language || 'es-ES',
        flowId: body.flowId || null,
        twilioSid: body.twilioSid || null,
        isActive: body.isActive ?? false,
      },
    })
    return NextResponse.json({ success: true, data: created })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
