import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, getWebhookConfig } from '@/lib/auth'

// POST /api/send/[channel] - Send a message to a user via a specific channel
// Uses the real platform APIs (WhatsApp Cloud API, Messenger, Instagram, Telegram)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const { channel } = await params
    const body = await request.json()
    const { recipientId, message, buttons, conversationId, replyToMessageId } = body

    if (!recipientId || !message) {
      return NextResponse.json(
        { success: false, error: 'recipientId and message are required' },
        { status: 400 }
      )
    }

    const config = await getWebhookConfig(channel)
    if (!config?.isActive) {
      return NextResponse.json(
        { success: false, error: `${channel} channel is not configured. Set up credentials at /api/webhook-config` },
        { status: 400 }
      )
    }

    let platformResponse: Record<string, unknown> = {}

    switch (channel) {
      case 'whatsapp':
        platformResponse = await sendWhatsApp(config, recipientId, message, buttons)
        break
      case 'messenger':
        platformResponse = await sendMessenger(config, recipientId, message, buttons)
        break
      case 'instagram':
        platformResponse = await sendInstagram(config, recipientId, message)
        break
      case 'telegram':
        platformResponse = await sendTelegram(config, recipientId, message, buttons, replyToMessageId)
        break
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported channel: ${channel}` },
          { status: 400 }
        )
    }

    // Store sent message in database
    if (conversationId) {
      await db.message.create({
        data: {
          conversationId,
          sender: 'bot',
          content: message,
          type: buttons ? 'buttons' : 'text',
          buttons: buttons ? JSON.stringify(buttons) : null,
          isBot: true,
        },
      })

      await db.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: message.substring(0, 100),
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        channel,
        recipientId,
        platformResponse,
      },
    })
  } catch (error) {
    console.error('[Send] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// ─── WhatsApp Cloud API ───────────────────────────────────────────────────────
async function sendWhatsApp(
  config: Record<string, unknown>,
  recipientId: string,
  message: string,
  buttons?: Array<{ id: string; text: string }>
): Promise<Record<string, unknown>> {
  const accessToken = config.accessToken as string
  const phoneNumberId = config.phoneNumberId as string
  const apiVersion = (config.apiVersion as string) || 'v18.0'
  const baseUrl = (config.baseUrl as string) || 'https://graph.facebook.com'

  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp requires accessToken and phoneNumberId in webhook config')
  }

  const url = `${baseUrl}/${apiVersion}/${phoneNumberId}/messages`
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  let payload: Record<string, unknown>

  if (buttons && buttons.length > 0 && buttons.length <= 3) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message },
        action: {
          buttons: buttons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.text.substring(0, 20) },
          })),
        },
      },
    }
  } else if (buttons && buttons.length > 3 && buttons.length <= 10) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: message },
        action: {
          button: 'Opciones',
          sections: [{
            title: 'Selecciona una opcion',
            rows: buttons.map(b => ({
              id: b.id,
              title: b.text.substring(0, 24),
              description: '',
            })),
          }],
        },
      },
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'text',
      text: { preview_url: false, body: message },
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[WhatsApp] Send error:', data)
    throw new Error(`WhatsApp API error: ${(data as Record<string, unknown>)?.error || response.statusText}`)
  }

  return data as Record<string, unknown>
}

// ─── Facebook Messenger Platform ──────────────────────────────────────────────
async function sendMessenger(
  config: Record<string, unknown>,
  recipientId: string,
  message: string,
  buttons?: Array<{ id: string; text: string }>
): Promise<Record<string, unknown>> {
  const accessToken = config.accessToken as string
  const apiVersion = (config.apiVersion as string) || 'v18.0'
  const baseUrl = (config.baseUrl as string) || 'https://graph.facebook.com'

  if (!accessToken) {
    throw new Error('Messenger requires accessToken in webhook config')
  }

  const url = `${baseUrl}/${apiVersion}/me/messages`
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  let payload: Record<string, unknown>

  if (buttons && buttons.length > 0) {
    payload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: message,
            buttons: buttons.slice(0, 3).map(b => ({
              type: 'postback',
              title: b.text.substring(0, 20),
              payload: b.id,
            })),
          },
        },
      },
    }
  } else {
    payload = {
      recipient: { id: recipientId },
      message: { text: message },
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[Messenger] Send error:', data)
    throw new Error(`Messenger API error: ${(data as Record<string, unknown>)?.error || response.statusText}`)
  }

  return data as Record<string, unknown>
}

// ─── Instagram Messaging API ──────────────────────────────────────────────────
async function sendInstagram(
  config: Record<string, unknown>,
  recipientId: string,
  message: string
): Promise<Record<string, unknown>> {
  const accessToken = config.accessToken as string
  const apiVersion = (config.apiVersion as string) || 'v18.0'
  const baseUrl = (config.baseUrl as string) || 'https://graph.facebook.com'

  if (!accessToken) {
    throw new Error('Instagram requires accessToken in webhook config')
  }

  const url = `${baseUrl}/${apiVersion}/me/messages`
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const payload = {
    recipient: { id: recipientId },
    message: { text: message },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[Instagram] Send error:', data)
    throw new Error(`Instagram API error: ${(data as Record<string, unknown>)?.error || response.statusText}`)
  }

  return data as Record<string, unknown>
}

// ─── Telegram Bot API ─────────────────────────────────────────────────────────
async function sendTelegram(
  config: Record<string, unknown>,
  recipientId: string,
  message: string,
  buttons?: Array<{ id: string; text: string }>,
  replyToMessageId?: string
): Promise<Record<string, unknown>> {
  const botToken = config.botToken as string
  const baseUrl = (config.baseUrl as string) || 'https://api.telegram.org'

  if (!botToken) {
    throw new Error('Telegram requires botToken in webhook config')
  }

  const url = `${baseUrl}/bot${botToken}/sendMessage`
  let payload: Record<string, unknown> = {
    chat_id: recipientId,
    text: message,
    parse_mode: 'Markdown',
  }

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId
  }

  if (buttons && buttons.length > 0) {
    payload = {
      ...payload,
      reply_markup: {
        inline_keyboard: [
          buttons.map(b => ({
            text: b.text,
            callback_data: b.id,
          })),
        ],
      },
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!data.ok) {
    console.error('[Telegram] Send error:', data)
    throw new Error(`Telegram API error: ${(data as Record<string, Record<string, unknown>>)?.description || 'Unknown error'}`)
  }

  return data.result as Record<string, unknown>
}
