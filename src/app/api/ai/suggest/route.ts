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

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que sugiere respuestas rapidas para un agente de atencion al cliente.
Basado en el mensaje del cliente, sugiere 3 respuestas cortas y profesionales.
Responde SOLO con un JSON array de strings, sin texto adicional.
Ejemplo: ["Respuesta 1", "Respuesta 2", "Respuesta 3"]`,
        },
        {
          role: 'user',
          content: `Contexto: ${context || 'Conversacion de soporte al cliente'}\n\nMensaje del cliente: ${message}`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const rawResponse = completion.choices?.[0]?.message?.content || '[]'

    let suggestions: string[]
    try {
      suggestions = JSON.parse(rawResponse)
    } catch {
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
