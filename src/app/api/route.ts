import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'ChatFlow API',
    version: '2.0.0',
    description: 'API REST para la plataforma de chatbots ChatFlow con IA GLM integrada, autenticacion por API Keys y webhooks reales',
    ai: {
      provider: 'GLM (Z.ai)',
      endpoints: {
        chat: 'POST /api/ai/chat - Generar respuestas con IA GLM',
        suggest: 'POST /api/ai/suggest - Sugerir respuestas rapidas con IA',
      },
    },
    authentication: {
      type: 'API Key (Bearer Token)',
      header: 'Authorization: Bearer cf_xxxx... o x-api-key: cf_xxxx...',
      permissions: ['read', 'write', 'admin', 'webhooks'],
      note: 'Todos los endpoints requieren autenticacion excepto webhooks entrantes (/api/webhook/[channel]). Crea API keys en /api/keys',
      management: {
        list: 'GET /api/keys (requiere admin)',
        create: 'POST /api/keys (requiere admin)',
        update: 'PATCH /api/keys/[keyId] (requiere admin)',
        revoke: 'DELETE /api/keys/[keyId] (requiere admin)',
      },
    },
    endpoints: {
      bots: {
        list: 'GET /api/bots (read)',
        create: 'POST /api/bots (write)',
        get: 'GET /api/bots/[botId] (read)',
        update: 'PATCH /api/bots/[botId] (write)',
        delete: 'DELETE /api/bots/[botId] (admin)',
        flows: {
          list: 'GET /api/bots/[botId]/flows (read)',
          create: 'POST /api/bots/[botId]/flows (write)',
        },
      },
      conversations: {
        list: 'GET /api/conversations?channel=whatsapp&status=active&botId=xxx (read)',
        create: 'POST /api/conversations (write)',
        get: 'GET /api/conversations/[convId] (read)',
        update: 'PATCH /api/conversations/[convId] (write)',
        messages: {
          list: 'GET /api/conversations/[convId]/messages (read)',
          send: 'POST /api/conversations/[convId]/messages (write)',
        },
        tags: {
          list: 'GET /api/conversations/[convId]/tags (read)',
          add: 'POST /api/conversations/[convId]/tags (write)',
        },
        notes: {
          list: 'GET /api/conversations/[convId]/notes (read)',
          add: 'POST /api/conversations/[convId]/notes (write)',
        },
        transfer: 'POST /api/conversations/[convId]/transfer (write)',
      },
      channels: {
        list: 'GET /api/channels (read)',
      },
      teams: {
        list: 'GET /api/teams (read)',
      },
      send: {
        whatsapp: 'POST /api/send/whatsapp - Enviar mensaje via WhatsApp Cloud API (write)',
        messenger: 'POST /api/send/messenger - Enviar mensaje via Messenger Platform (write)',
        instagram: 'POST /api/send/instagram - Enviar mensaje via Instagram API (write)',
        telegram: 'POST /api/send/telegram - Enviar mensaje via Telegram Bot API (write)',
      },
      webhooks: {
        whatsapp: 'POST /api/webhook/whatsapp - Recibir mensajes (sin auth - firma verificada)',
        messenger: 'POST /api/webhook/messenger - Recibir mensajes (sin auth - firma verificada)',
        instagram: 'POST /api/webhook/instagram - Recibir mensajes (sin auth - firma verificada)',
        telegram: 'POST /api/webhook/telegram - Recibir mensajes (sin auth - firma verificada)',
        verify: 'GET /api/webhook/[channel] - Verificar webhook con hub.challenge',
      },
      webhookConfig: {
        list: 'GET /api/webhook-config (admin)',
        save: 'POST /api/webhook-config (admin)',
      },
    },
    examples: {
      createApiKey: {
        method: 'POST',
        url: '/api/keys',
        headers: { 'x-api-key': 'cf_admin_master_key' },
        body: { name: 'Mi App', permissions: ['read', 'write'] },
      },
      sendWhatsapp: {
        method: 'POST',
        url: '/api/send/whatsapp',
        headers: { 'Authorization': 'Bearer cf_tu_api_key' },
        body: {
          recipientId: '+521234567890',
          message: 'Hola! En que podemos ayudarte?',
          buttons: [{ id: 'b1', text: 'Mi pedido' }, { id: 'b2', text: 'Pagos' }],
          conversationId: 'conv-123',
        },
      },
      aiChat: {
        method: 'POST',
        url: '/api/ai/chat',
        headers: { 'Authorization': 'Bearer cf_tu_api_key' },
        body: {
          message: 'Cuales son los horarios de atencion?',
          botName: 'Asistente Ventas',
          channel: 'whatsapp',
          conversationHistory: [
            { sender: 'user', content: 'Hola' },
            { sender: 'assistant', content: 'Hola! En que puedo ayudarte?' },
          ],
        },
      },
      webhookWhatsApp: {
        note: 'Los webhooks entrantes NO requieren API key - se verifican con firma HMAC',
        url: '/api/webhook/whatsapp',
        metaFormat: 'WhatsApp Cloud API envia automaticamente a esta URL cuando configuras tu app',
      },
    },
  })
}
