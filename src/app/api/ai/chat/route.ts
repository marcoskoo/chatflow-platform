import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/chat - Generate AI response using GLM (z-ai-web-dev-sdk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory, systemPrompt, botName, channel } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Dynamic import for z-ai-web-dev-sdk (server-side only)
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const defaultSystemPrompt = `Eres un asistente virtual profesional y empático llamado ${botName || "ChatFlow Assistant"}. 
Tu trabajo es ayudar a los clientes de manera eficiente y amigable.
Estás respondiendo a través de ${channel || "un canal de mensajería"}, así que mantén las respuestas concisas y claras.
Responde en el mismo idioma que el usuario.
Si no puedes resolver algo, sugiere amablemente transferir a un agente humano.
Puedes usar emojis moderadamente para hacer la conversación más amigable.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: systemPrompt || defaultSystemPrompt,
      },
    ];

    // Add conversation history for context
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices?.[0]?.message?.content || 
      "Lo siento, no pude procesar tu solicitud. ¿Puedo ayudarte con algo más?";

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        model: "GLM",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
