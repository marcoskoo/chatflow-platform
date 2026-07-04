import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// POST /api/ai/chat - Generate AI response using GLM API
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

    const apiKey = process.env.GLM_API_KEY
    const apiUrl = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

    if (!apiKey) {
      // Fallback: try z-ai-web-dev-sdk if available
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()

        const defaultSystemPrompt = `Eres un asistente virtual profesional y empatico llamado ${botName || 'ChatFlow Assistant'}. 
Tu trabajo es ayudar a los clientes de manera eficiente y amigable.
Estas respondiendo a traves de ${channel || 'un canal de mensajeria'}, asi que mantén las respuestas concisas y claras.
Responde en el mismo idioma que el usuario.
Si no puedes resolver algo, sugiere amablemente transferir a un agente humano.
Puedes usar emojis moderadamente para hacer la conversacion mas amigable.`

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt || defaultSystemPrompt },
        ]

        if (conversationHistory && Array.isArray(conversationHistory)) {
          for (const msg of conversationHistory.slice(-10)) {
            messages.push({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content,
            })
          }
        }

        messages.push({ role: 'user', content: message })

        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' },
        })

        const aiResponse = completion.choices?.[0]?.message?.content ||
          'Lo siento, no pude procesar tu solicitud. Puedo ayudarte con algo mas?'

        return NextResponse.json({
          success: true,
          data: { response: aiResponse, model: 'GLM-SDK', timestamp: new Date().toISOString() },
        })
      } catch {
        return NextResponse.json(
          { success: false, error: 'GLM_API_KEY not configured and SDK fallback failed' },
          { status: 503 }
        )
      }
    }

    const defaultSystemPrompt = `Eres un asistente virtual profesional y empatico llamado ${botName || 'ChatFlow Assistant'}. 
Tu trabajo es ayudar a los clientes de manera eficiente y amigable.
Estas respondiendo a traves de ${channel || 'un canal de mensajeria'}, asi que mantén las respuestas concisas y claras.
Responde en el mismo idioma que el usuario.
Si no puedes resolver algo, sugiere amablemente transferir a un agente humano.
Puedes usar emojis moderadamente para hacer la conversacion mas amigable.`

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt || defaultSystemPrompt },
    ]

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })
      }
    }

    messages.push({ role: 'user', content: message })

    // Direct GLM API call via fetch (works in serverless environments)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[GLM API] Error:', response.status, errorData)
      return NextResponse.json(
        { success: false, error: `GLM API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content ||
      'Lo siento, no pude procesar tu solicitud. Puedo ayudarte con algo mas?'

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        model: data.model || 'glm-4-flash',
        usage: data.usage || null,
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
