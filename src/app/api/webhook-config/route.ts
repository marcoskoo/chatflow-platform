import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/webhook-config - List all webhook configurations
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  const configs = await db.webhookConfig.findMany({
    orderBy: { channel: 'asc' },
  })

  // Mask sensitive fields
  const masked = configs.map(c => ({
    ...c,
    accessToken: c.accessToken ? `${c.accessToken.substring(0, 8)}...***` : null,
    appSecret: c.appSecret ? `${c.appSecret.substring(0, 4)}***` : null,
    botToken: c.botToken ? `${c.botToken.substring(0, 10)}...***` : null,
    webhookSecret: c.webhookSecret ? `${c.webhookSecret.substring(0, 4)}***` : null,
  }))

  return NextResponse.json({ success: true, data: masked })
}

// POST /api/webhook-config - Create or update webhook configuration for a channel
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const {
      channel, verifyToken, accessToken, appSecret,
      phoneNumberId, pageId, botToken, webhookSecret,
      apiVersion, baseUrl, isActive,
    } = body

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel is required' },
        { status: 400 }
      )
    }

    const validChannels = ['whatsapp', 'messenger', 'instagram', 'telegram']
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    // Upsert: create or update config for this channel
    const config = await db.webhookConfig.upsert({
      where: { channel },
      create: {
        channel,
        verifyToken: verifyToken || null,
        accessToken: accessToken || null,
        appSecret: appSecret || null,
        phoneNumberId: phoneNumberId || null,
        pageId: pageId || null,
        botToken: botToken || null,
        webhookSecret: webhookSecret || null,
        apiVersion: apiVersion || 'v18.0',
        baseUrl: baseUrl || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        verifyToken: verifyToken !== undefined ? verifyToken : undefined,
        accessToken: accessToken !== undefined ? accessToken : undefined,
        appSecret: appSecret !== undefined ? appSecret : undefined,
        phoneNumberId: phoneNumberId !== undefined ? phoneNumberId : undefined,
        pageId: pageId !== undefined ? pageId : undefined,
        botToken: botToken !== undefined ? botToken : undefined,
        webhookSecret: webhookSecret !== undefined ? webhookSecret : undefined,
        apiVersion: apiVersion !== undefined ? apiVersion : undefined,
        baseUrl: baseUrl !== undefined ? baseUrl : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        accessToken: config.accessToken ? `${config.accessToken.substring(0, 8)}...***` : null,
        appSecret: config.appSecret ? `${config.appSecret.substring(0, 4)}***` : null,
        botToken: config.botToken ? `${config.botToken.substring(0, 10)}...***` : null,
      },
      message: `Webhook configuration for ${channel} saved successfully`,
    })
  } catch (error) {
    console.error('Webhook config error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save webhook configuration' },
      { status: 500 }
    )
  }
}
