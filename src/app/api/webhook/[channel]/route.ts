import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyMetaSignature, verifyTelegramSignature, getWebhookConfig } from '@/lib/auth'

// ─── POST /api/webhook/[channel] ─────────────────────────────────────────────
// Receives incoming messages from WhatsApp, Messenger, Instagram, Telegram
// Validates signatures, parses platform-specific payloads, stores in DB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params
    const rawBody = await request.text()
    let body: Record<string, unknown>

    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Get channel webhook config from database
    const config = await getWebhookConfig(channel)

    // ─── Signature Verification ──────────────────────────────────────────
    if (config?.isActive) {
      if (channel === 'whatsapp' || channel === 'messenger' || channel === 'instagram') {
        // Meta platforms use X-Hub-Signature-256 header
        const signature = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature') || ''
        if (config.appSecret && signature) {
          const isValid = verifyMetaSignature(config.appSecret, rawBody, signature)
          if (!isValid) {
            console.warn(`[Webhook] Invalid ${channel} signature - possible spoofing attempt`)
            return NextResponse.json(
              { success: false, error: 'Invalid signature' },
              { status: 403 }
            )
          }
        }
      } else if (channel === 'telegram' && config.botToken) {
        const secretHeader = request.headers.get('x-telegram-bot-api-secret-token') || undefined
        if (secretHeader && config.webhookSecret) {
          const isValid = verifyTelegramSignature(config.botToken, rawBody, secretHeader)
          if (!isValid) {
            console.warn('[Webhook] Invalid Telegram signature')
            return NextResponse.json(
              { success: false, error: 'Invalid signature' },
              { status: 403 }
            )
          }
        }
      }
    }

    // ─── Parse Platform-Specific Payloads ────────────────────────────────
    let contactName = ''
    let messageContent = ''
    let senderId = ''
    let messageId = ''
    let botId = 'default'

    switch (channel) {
      case 'whatsapp': {
        // WhatsApp Cloud API format
        const entry = Array.isArray(body.entry) ? body.entry[0] as Record<string, unknown> : null
        const changes = entry?.changes?.[0] as Record<string, unknown> | undefined
        const value = changes?.value as Record<string, unknown> | undefined
        const contacts = value?.contacts as Array<Record<string, unknown>> | undefined
        const messages = value?.messages as Array<Record<string, unknown>> | undefined

        if (messages && messages.length > 0) {
          const msg = messages[0]
          const profile = contacts?.[0]?.profile as Record<string, unknown> | undefined
          contactName = (profile?.name as string) || (contacts?.[0]?.wa_id as string) || 'WhatsApp User'
          senderId = (msg.from as string) || ''
          messageId = (msg.id as string) || ''

          const msgType = msg.type as string
          if (msgType === 'text') {
            const text = msg.text as Record<string, unknown>
            messageContent = (text?.body as string) || ''
          } else if (msgType === 'interactive') {
            const interactive = msg.interactive as Record<string, unknown>
            if (interactive?.type === 'button_reply') {
              const buttonReply = interactive.button_reply as Record<string, unknown>
              messageContent = (buttonReply?.title as string) || (buttonReply?.id as string) || ''
            } else if (interactive?.type === 'list_reply') {
              const listReply = interactive.list_reply as Record<string, unknown>
              messageContent = (listReply?.title as string) || (listReply?.id as string) || ''
            } else {
              messageContent = JSON.stringify(interactive)
            }
          } else if (msgType === 'button') {
            const button = msg.button as Record<string, unknown>
            messageContent = (button?.text as string) || ''
          } else if (msgType === 'location') {
            const location = msg.location as Record<string, unknown>
            messageContent = `📍 Ubicación: ${location?.name || ''} (${location?.latitude}, ${location?.longitude})`
          } else if (msgType === 'image' || msgType === 'document' || msgType === 'audio' || msgType === 'video') {
            messageContent = `[${msgType.toUpperCase()}] Media recibido`
          } else {
            messageContent = `[${msgType}] Mensaje no soportado`
          }
        } else {
          // Status update (delivered, read, etc.) - acknowledge but don't create message
          return NextResponse.json({ success: true, data: { status: 'acknowledged' } })
        }
        break
      }

      case 'messenger': {
        // Facebook Messenger format
        const entry = Array.isArray(body.entry) ? body.entry[0] as Record<string, unknown> : null
        const messaging = entry?.messaging?.[0] as Record<string, unknown> | undefined
        if (!messaging) {
          return NextResponse.json({ success: true, data: { status: 'acknowledged' } })
        }

        const sender = messaging.sender as Record<string, unknown>
        const message = messaging.message as Record<string, unknown>
        contactName = (sender?.name as string) || (sender?.id as string) || 'Messenger User'
        senderId = (sender?.id as string) || ''
        messageId = (message?.mid as string) || ''

        if (message?.text) {
          messageContent = message.text as string
        } else if (message?.attachments) {
          const attachments = message.attachments as Array<Record<string, unknown>>
          messageContent = `[ATTACHMENT] ${attachments.map(a => a.type).join(', ')}`
        } else if (message?.quick_reply) {
          const quickReply = message.quick_reply as Record<string, unknown>
          messageContent = (quickReply?.title as string) || (quickReply?.payload as string) || ''
        }
        break
      }

      case 'instagram': {
        // Instagram Direct Message format (via Meta Graph API)
        const entry = Array.isArray(body.entry) ? body.entry[0] as Record<string, unknown> : null
        const messaging = entry?.messaging?.[0] as Record<string, unknown> | undefined
        if (!messaging) {
          return NextResponse.json({ success: true, data: { status: 'acknowledged' } })
        }

        const sender = messaging.sender as Record<string, unknown>
        const message = messaging.message as Record<string, unknown>
        contactName = (sender?.name as string) || (sender?.id as string) || 'Instagram User'
        senderId = (sender?.id as string) || ''
        messageId = (message?.mid as string) || ''

        if (message?.text) {
          messageContent = message.text as string
        } else if (message?.attachments) {
          const attachments = message.attachments as Array<Record<string, unknown>>
          messageContent = `[ATTACHMENT] ${attachments.map(a => a.type).join(', ')}`
        }
        break
      }

      case 'telegram': {
        // Telegram Bot API format
        const message = body.message as Record<string, unknown> | undefined
        const callbackQuery = body.callback_query as Record<string, unknown> | undefined

        if (callbackQuery) {
          // Inline keyboard button callback
          const from = callbackQuery.from as Record<string, unknown>
          contactName = `${from?.first_name || ''} ${from?.last_name || ''}`.trim() || 'Telegram User'
          senderId = (from?.id as string)?.toString() || ''
          messageContent = (callbackQuery.data as string) || (callbackQuery.message as Record<string, unknown>)?.text as string || ''
          messageId = (callbackQuery.id as string) || ''
        } else if (message) {
          const from = message.from as Record<string, unknown>
          contactName = `${from?.first_name || ''} ${from?.last_name || ''}`.trim() || 'Telegram User'
          senderId = (from?.id as string)?.toString() || ''
          messageId = (message.message_id as string) || ''

          if (message.text) {
            messageContent = message.text as string
          } else if (message.location) {
            const location = message.location as Record<string, unknown>
            messageContent = `📍 Ubicación: ${location.latitude}, ${location.longitude}`
          } else if (message.contact) {
            const contact = message.contact as Record<string, unknown>
            messageContent = `👤 Contacto: ${contact.first_name} ${contact.last_name || ''} - ${contact.phone_number || ''}`
          } else if (message.photo) {
            messageContent = '📷 Foto recibida'
          } else if (message.document) {
            const doc = message.document as Record<string, unknown>
            messageContent = `📄 Documento: ${doc.file_name || 'archivo'}`
          } else if (message.sticker) {
            messageContent = '🎭 Sticker recibido'
          } else {
            messageContent = '[Mensaje multimedia]'
          }
        } else {
          return NextResponse.json({ success: true, data: { status: 'acknowledged' } })
        }
        break
      }

      default: {
        // Generic/fallback webhook format
        contactName = (body.contactName as string) || (body.sender as string) || (body.name as string) || 'User'
        messageContent = (body.message as string) || (body.text as string) || (body.content as string) || ''
        senderId = (body.senderId as string) || (body.from as string) || ''
        botId = (body.botId as string) || 'default'
      }
    }

    if (!messageContent) {
      return NextResponse.json(
        { success: false, error: 'No message content found' },
        { status: 400 }
      )
    }

    // ─── Store Conversation & Message ────────────────────────────────────
    // Use senderId + channel as unique identifier for finding existing conversations
    const conversationKey = senderId || contactName
    let conversation = await db.conversation.findFirst({
      where: {
        botId,
        channel,
        contactName: conversationKey,
        status: { in: ['active', 'pending'] },
      },
    })

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          botId,
          channel,
          contactName: contactName || conversationKey,
          contactAvatar: null,
          status: 'active',
          unread: 1,
          lastMessage: messageContent.substring(0, 100),
        },
      })
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: messageContent.substring(0, 100),
          unread: { increment: 1 },
          updatedAt: new Date(),
        },
      })
    }

    const msgType = channel === 'telegram' && body.callback_query ? 'buttons' : 'text'
    await db.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'user',
        content: messageContent,
        type: msgType,
        isBot: false,
      },
    })

    // ─── Auto-Reply via Flow (if bot has active flow) ─────────────────────
    // This will be triggered if the conversation has an associated bot with an active flow
    // The flow engine processes the message and determines the next response

    // For Telegram, acknowledge callback queries
    if (channel === 'telegram' && body.callback_query) {
      const callbackId = (body.callback_query as Record<string, unknown>).id as string
      // We'll handle this in the send endpoint; just note it for now
      console.log(`[Telegram] Callback query ${callbackId} received, needs acknowledgment`)
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        messageId: messageId || undefined,
        channel,
        contact: contactName,
        message: 'Message received and processed',
      },
    })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// ─── GET /api/webhook/[channel] ──────────────────────────────────────────────
// Webhook verification endpoint for Meta platforms (WhatsApp, Messenger, Instagram)
// and health check for all channels

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const challenge = searchParams.get('hub.challenge')
  const verifyToken = searchParams.get('hub.verify_token')

  // Meta webhook verification flow
  if (mode === 'subscribe' && challenge) {
    const config = await getWebhookConfig(channel)

    if (config?.verifyToken && verifyToken === config.verifyToken) {
      console.log(`[Webhook] ${channel} verification successful`)
      return new Response(challenge, { status: 200 })
    }

    console.warn(`[Webhook] ${channel} verification failed - token mismatch`)
    return NextResponse.json(
      { success: false, error: 'Verification token mismatch' },
      { status: 403 }
    )
  }

  // Health check / info endpoint
  const config = await getWebhookConfig(channel)
  const isConnected = config?.isActive ?? false

  return NextResponse.json({
    status: 'ok',
    channel,
    connected: isConnected,
    message: isConnected
      ? `Webhook endpoint active for ${channel}. Configure this URL in your ${channel} developer settings.`
      : `Webhook endpoint ready, but ${channel} is not configured. Use /api/webhook-config to set up credentials.`,
    webhookUrl: `/api/webhook/${channel}`,
    supportedChannels: ['whatsapp', 'messenger', 'instagram', 'telegram'],
    setupInstructions: getSetupInstructions(channel),
  })
}

function getSetupInstructions(channel: string): Record<string, string> {
  const instructions: Record<string, Record<string, string>> = {
    whatsapp: {
      platform: 'WhatsApp Business Cloud API',
      steps: '1. Create app at developers.facebook.com 2. Add WhatsApp product 3. Configure webhook URL 4. Set verify_token in /api/webhook-config 5. Subscribe to messages events',
      docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    },
    messenger: {
      platform: 'Facebook Messenger Platform',
      steps: '1. Create Facebook App 2. Add Messenger product 3. Generate Page Access Token 4. Configure webhook with verify_token 5. Subscribe to messages, messaging_postbacks events',
      docs: 'https://developers.facebook.com/docs/messenger-platform',
    },
    instagram: {
      platform: 'Instagram Messaging API',
      steps: '1. Create Facebook App 2. Add Instagram product 3. Connect Instagram Business account 4. Configure webhook 5. Subscribe to messages events',
      docs: 'https://developers.facebook.com/docs/instagram-api',
    },
    telegram: {
      platform: 'Telegram Bot API',
      steps: '1. Create bot via @BotFather 2. Get bot token 3. Set webhook URL via: https://api.telegram.org/bot<token>/setWebhook?url=<your-url>/api/webhook/telegram 4. Optionally set secret_token',
      docs: 'https://core.telegram.org/bots/api',
    },
  }
  return instructions[channel] || { message: 'Unknown channel' }
}
