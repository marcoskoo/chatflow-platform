import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "ChatFlow API",
    version: "1.0.0",
    description: "API REST para la plataforma de chatbots ChatFlow con IA GLM integrada",
    ai: {
      provider: "GLM (Z.ai)",
      endpoints: {
        chat: "POST /api/ai/chat - Generar respuestas con IA GLM",
        suggest: "POST /api/ai/suggest - Sugerir respuestas rápidas con IA",
      },
    },
    endpoints: {
      bots: {
        list: "GET /api/bots",
        create: "POST /api/bots",
        get: "GET /api/bots/[botId]",
        update: "PATCH /api/bots/[botId]",
        delete: "DELETE /api/bots/[botId]",
        flows: {
          list: "GET /api/bots/[botId]/flows",
          create: "POST /api/bots/[botId]/flows",
        },
      },
      conversations: {
        list: "GET /api/conversations?channel=whatsapp&status=active&botId=xxx",
        create: "POST /api/conversations",
        get: "GET /api/conversations/[convId]",
        update: "PATCH /api/conversations/[convId]",
        messages: {
          list: "GET /api/conversations/[convId]/messages",
          send: "POST /api/conversations/[convId]/messages",
        },
        tags: {
          list: "GET /api/conversations/[convId]/tags",
          add: "POST /api/conversations/[convId]/tags",
        },
        notes: {
          list: "GET /api/conversations/[convId]/notes",
          add: "POST /api/conversations/[convId]/notes",
        },
        transfer: "POST /api/conversations/[convId]/transfer",
      },
      channels: {
        list: "GET /api/channels",
        webhook: "POST /api/webhook/[channel] - Recibir mensajes de WhatsApp/Messenger/Instagram/Telegram",
        verify: "GET /api/webhook/[channel] - Verificar webhook",
      },
      teams: {
        list: "GET /api/teams",
      },
    },
    authentication: {
      type: "Bearer Token (próximamente)",
      note: "Actualmente las APIs están abiertas para desarrollo. Agrega autenticación antes de producción.",
    },
    examples: {
      sendWhatsappMessage: {
        method: "POST",
        url: "/api/conversations/conv-123/messages",
        body: {
          sender: "bot",
          content: "¡Hola! ¿En qué puedo ayudarte?",
          type: "buttons",
          buttons: [
            { id: "b1", text: "📦 Mi pedido" },
            { id: "b2", text: "💳 Pagos" },
            { id: "b3", text: "🗣️ Hablar con agente" },
          ],
          isBot: true,
        },
      },
      aiChat: {
        method: "POST",
        url: "/api/ai/chat",
        body: {
          message: "¿Cuáles son los horarios de atención?",
          botName: "Asistente Ventas",
          channel: "whatsapp",
          conversationHistory: [
            { sender: "user", content: "Hola" },
            { sender: "assistant", content: "¡Hola! ¿En qué puedo ayudarte?" },
          ],
        },
      },
      transferConversation: {
        method: "POST",
        url: "/api/conversations/conv-123/transfer",
        body: {
          team: "Soporte Técnico",
          assignedTo: "Carlos López",
        },
      },
      webhookWhatsApp: {
        method: "POST",
        url: "/api/webhook/whatsapp",
        body: {
          botId: "bot-1",
          contact: { name: "Juan Pérez", phone: "+521234567890" },
          message: { text: "Necesito ayuda", id: "msg_123" },
        },
      },
    },
  });
}
