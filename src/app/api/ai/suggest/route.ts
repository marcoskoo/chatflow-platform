import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// POST /api/ai/suggest - Get AI suggestions for quick replies
// Requires 'write' permission
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'write')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { message, context } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GLM_API_KEY
    const apiUrl = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

    const systemPrompt = `Eres un asistente que sugiere respuestas rapidas para un agente de atencion al cliente.
Basado en el mensaje del cliente, sugiere 3 respuestas cortas y profesionales.
Responde SOLO con un JSON array de strings, sin texto adicional.
Ejemplo: ["Respuesta 1", "Respuesta 2", "Respuesta 3"]`

    const userPrompt = `Contexto: ${context || 'Conversacion de soporte al cliente'}\n\nMensaje del cliente: ${message}`

    let rawResponse: string

    if (apiKey) {
      // Use GLM API directly via fetch
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 256,
        }),
      })

      if (!response.ok) {
        console.error('[GLM Suggest] Error:', response.status)
        rawResponse = '[]'
      } else {
        const data = await response.json()
        rawResponse = data.choices?.[0]?.message?.content || '[]'
      }
    } else {
      // Fallback to SDK
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          thinking: { type: 'disabled' },
        })
        rawResponse = completion.choices?.[0]?.message?.content || '[]'
      } catch {
        rawResponse = '[]'
      }
    }

    let suggestions: string[]
    try {
      suggestions = JSON.parse(rawResponse)
      if (!Array.isArray(suggestions)) suggestions = []
    } catch {
      suggestions = []
    }

    // Ensure we always have fallback suggestions
    if (suggestions.length === 0) {
      suggestions = [
        'Gracias por tu mensaje, puedo ayudarte con algo mas?',
        'Entiendo tu consulta, dejame revisarlo.',
        'Podrias darme mas detalles sobre tu solicitud?',
      ]
    }

    return NextResponse.json({
      success: true,
      data: { suggestions },
    })
  } catch (error) {
    console.error('AI Suggest Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
