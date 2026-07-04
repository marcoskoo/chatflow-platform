import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// POST /api/ai/chat - Generate AI response using GLM (z-ai-web-dev-sdk)
// Requires 'write' permission (AI is a write operation - it generates content)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { message, conversationHistory, systemPrompt, botName, channel } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Dynamic import for z-ai-web-dev-sdk (server-side only)
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const defaultSystemPrompt = `Eres un asistente virtual profesional y empatico llamado ${botName || 'ChatFlow Assistant'}. 
Tu trabajo es ayudar a los clientes de manera eficiente y amigable.
Estas respondiendo a traves de ${channel || 'un canal de mensajeria'}, asi que mantén las respuestas concisas y claras.
Responde en el mismo idioma que el usuario.
Si no puedes resolver algo, sugiere amablemente transferir a un agente humano.
Puedes usar emojis moderadamente para hacer la conversacion mas amigable.`

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt,
      },
    ]

    // Add conversation history for context
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    })

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const aiResponse = completion.choices?.[0]?.message?.content ||
      'Lo siento, no pude procesar tu solicitud. Puedo ayudarte con algo mas?'

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        model: 'GLM',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
