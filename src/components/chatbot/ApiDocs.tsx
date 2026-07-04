'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/chatbot/ui'
import { Code, Copy, Check, Zap, MessageSquare, Bot, Brain, Globe, Key, ArrowRight } from 'lucide-react'

const apiEndpoints = [
  {
    category: 'IA GLM',
    icon: <Brain className="w-4 h-4" />,
    color: 'bg-violet-500',
    endpoints: [
      {
        method: 'POST',
        path: '/api/ai/chat',
        description: 'Generar respuesta con IA GLM',
        body: `{
  "message": "¿Cuáles son los horarios?",
  "botName": "Asistente Ventas",
  "channel": "whatsapp",
  "conversationHistory": [
    { "sender": "user", "content": "Hola" },
    { "sender": "assistant", "content": "¡Hola! ¿En qué puedo ayudarte?" }
  ],
  "systemPrompt": "Eres un asistente amable..."
}`,
        response: `{
  "success": true,
  "data": {
    "response": "Nuestros horarios son L-V 9am-6pm...",
    "model": "GLM",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/ai/suggest',
        description: 'Obtener sugerencias de respuesta rápidas',
        body: `{
  "message": "Necesito ayuda con mi pedido",
  "context": "Conversación de soporte"
}`,
        response: `{
  "success": true,
  "data": {
    "suggestions": [
      "Claro, ¿cuál es tu número de pedido?",
      "Puedo ayudarte. ¿Qué problema tienes?",
      "Déjame revisar tu pedido."
    ]
  }
}`,
      },
    ],
  },
  {
    category: 'Bots',
    icon: <Bot className="w-4 h-4" />,
    color: 'bg-emerald-500',
    endpoints: [
      { method: 'GET', path: '/api/bots', description: 'Listar todos los bots' },
      { method: 'POST', path: '/api/bots', description: 'Crear un nuevo bot', body: '{\n  "name": "Mi Bot",\n  "description": "Descripción",\n  "channels": ["whatsapp", "telegram"]\n}' },
      { method: 'GET', path: '/api/bots/[botId]', description: 'Obtener un bot específico' },
      { method: 'PATCH', path: '/api/bots/[botId]', description: 'Actualizar un bot' },
      { method: 'DELETE', path: '/api/bots/[botId]', description: 'Eliminar un bot' },
      { method: 'GET', path: '/api/bots/[botId]/flows', description: 'Listar flujos de un bot' },
      { method: 'POST', path: '/api/bots/[botId]/flows', description: 'Crear un nuevo flujo', body: '{\n  "name": "Flujo Bienvenida",\n  "nodes": [...],\n  "edges": [...],\n  "isActive": true\n}' },
    ],
  },
  {
    category: 'Conversaciones',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-blue-500',
    endpoints: [
      { method: 'GET', path: '/api/conversations?channel=whatsapp&status=active', description: 'Listar conversaciones (filtros opcionales)' },
      { method: 'POST', path: '/api/conversations', description: 'Crear conversación', body: '{\n  "botId": "bot-1",\n  "channel": "whatsapp",\n  "contactName": "Juan Pérez"\n}' },
      { method: 'GET', path: '/api/conversations/[convId]', description: 'Obtener conversación con mensajes' },
      { method: 'PATCH', path: '/api/conversations/[convId]', description: 'Actualizar estado/asignación' },
      { method: 'GET', path: '/api/conversations/[convId]/messages', description: 'Listar mensajes' },
      { method: 'POST', path: '/api/conversations/[convId]/messages', description: 'Enviar mensaje con botones', body: '{\n  "sender": "bot",\n  "content": "Selecciona una opción:",\n  "type": "buttons",\n  "buttons": [\n    { "id": "b1", "text": "📦 Mi pedido" },\n    { "id": "b2", "text": "💳 Pagos" },\n    { "id": "b3", "text": "🗣️ Agente" }\n  ],\n  "isBot": true\n}' },
      { method: 'GET', path: '/api/conversations/[convId]/tags', description: 'Listar etiquetas' },
      { method: 'POST', path: '/api/conversations/[convId]/tags', description: 'Agregar etiqueta', body: '{\n  "name": "VIP",\n  "color": "#8b5cf6"\n}' },
      { method: 'GET', path: '/api/conversations/[convId]/notes', description: 'Listar notas' },
      { method: 'POST', path: '/api/conversations/[convId]/notes', description: 'Agregar nota', body: '{\n  "content": "Cliente premium",\n  "author": "Carlos"\n}' },
      { method: 'POST', path: '/api/conversations/[convId]/transfer', description: 'Transferir a equipo/agente', body: '{\n  "team": "Soporte Técnico",\n  "assignedTo": "Carlos López"\n}' },
    ],
  },
  {
    category: 'Webhooks',
    icon: <Globe className="w-4 h-4" />,
    color: 'bg-cyan-500',
    endpoints: [
      { method: 'POST', path: '/api/webhook/whatsapp', description: 'Recibir mensajes de WhatsApp', body: '{\n  "botId": "bot-1",\n  "contact": { "name": "Juan", "phone": "+521234" },\n  "message": { "text": "Hola", "id": "msg_123" }\n}' },
      { method: 'POST', path: '/api/webhook/messenger', description: 'Recibir mensajes de Messenger' },
      { method: 'POST', path: '/api/webhook/instagram', description: 'Recibir mensajes de Instagram' },
      { method: 'POST', path: '/api/webhook/telegram', description: 'Recibir mensajes de Telegram' },
      { method: 'GET', path: '/api/webhook/[channel]', description: 'Verificar webhook (Meta/WhatsApp)' },
    ],
  },
  {
    category: 'Otros',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-amber-500',
    endpoints: [
      { method: 'GET', path: '/api/channels', description: 'Listar canales configurados' },
      { method: 'GET', path: '/api/teams', description: 'Listar equipos' },
    ],
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

export function ApiDocs() {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const curlExample = `# Ejemplo: Enviar mensaje con botones usando cURL
curl -X POST http://tu-servidor.com/api/conversations/conv-123/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": "bot",
    "content": "Selecciona una opción:",
    "type": "buttons",
    "buttons": [
      { "id": "b1", "text": "📦 Mi pedido" },
      { "id": "b2", "text": "💳 Pagos" },
      { "id": "b3", "text": "🗣️ Agente" }
    ],
    "isBot": true
  }'

# Ejemplo: Generar respuesta con IA GLM
curl -X POST http://tu-servidor.com/api/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "¿Cuáles son los horarios?",
    "botName": "Mi Asistente",
    "channel": "whatsapp"
  }'`

  const jsExample = `// Ejemplo: Integración con JavaScript/Node.js

// 1. Enviar mensaje con botones clicables
const sendMessage = async (convId, text, buttons) => {
  const res = await fetch(\`/api/conversations/\${convId}/messages\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: 'bot',
      content: text,
      type: 'buttons',
      buttons: buttons,
      isBot: true
    })
  });
  return res.json();
};

// 2. Obtener respuesta de IA GLM
const getAiResponse = async (userMessage, history) => {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      conversationHistory: history,
      botName: 'Mi Asistente',
      channel: 'whatsapp'
    })
  });
  const data = await res.json();
  return data.data.response;
};

// 3. Transferir conversación
const transferToTeam = async (convId, team, agent) => {
  const res = await fetch(\`/api/conversations/\${convId}/transfer\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, assignedTo: agent })
  });
  return res.json();
};`

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Code className="w-6 h-6 text-violet-500" /> API & Integraciones
        </h1>
        <p className="text-slate-500 mt-1">API REST completa con IA GLM integrada para usar ChatFlow desde cualquier aplicación</p>
      </div>

      {/* AI GLM Feature Card */}
      <Card className="border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center text-white">
              <Brain className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">IA GLM Integrada</h2>
              <p className="text-sm text-slate-600 mt-1">
                Usa el poder de GLM (el modelo de IA de Z.ai) directamente desde tu API. Genera respuestas inteligentes,
                sugerencias contextuales y automatiza conversaciones con IA de última generación.
              </p>
              <div className="flex gap-2 mt-3">
                <Badge className="bg-violet-100 text-violet-700">POST /api/ai/chat</Badge>
                <Badge className="bg-violet-100 text-violet-700">POST /api/ai/suggest</Badge>
                <Badge className="bg-violet-100 text-violet-700">Contexto Multi-turno</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-800 text-white text-xs flex items-center justify-center font-mono">$</span>
              cURL Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                <code>{curlExample}</code>
              </pre>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => handleCopy(curlExample, 'curl')}>
                {copiedCode === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-500 text-white text-xs flex items-center justify-center font-mono">JS</span>
              JavaScript/Node.js
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-slate-900 text-amber-400 p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                <code>{jsExample}</code>
              </pre>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => handleCopy(jsExample, 'js')}>
                {copiedCode === 'js' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints */}
      <div className="space-y-4">
        {apiEndpoints.map((category) => (
          <Card key={category.category} className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg ${category.color} text-white flex items-center justify-center`}>{category.icon}</span>
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {category.endpoints.map((ep, idx) => {
                  const epId = `${category.category}-${idx}`
                  const isExpanded = expandedEndpoint === epId
                  return (
                    <div key={epId} className="border border-slate-100 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center gap-2 p-2.5 hover:bg-slate-50 transition-colors text-left"
                        onClick={() => setExpandedEndpoint(isExpanded ? null : epId)}
                      >
                        <Badge className={`text-[10px] font-mono px-1.5 py-0 ${methodColors[ep.method]}`}>
                          {ep.method}
                        </Badge>
                        <code className="text-xs text-slate-700 font-mono flex-1">{ep.path}</code>
                        <span className="text-xs text-slate-500">{ep.description}</span>
                        <ArrowRight className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      {isExpanded && (ep.body || ep.response) && (
                        <div className="border-t border-slate-100 p-3 bg-slate-50 space-y-2">
                          {ep.body && (
                            <div>
                              <p className="text-[10px] text-slate-500 font-semibold mb-1 uppercase">Request Body</p>
                              <div className="relative">
                                <pre className="bg-slate-900 text-blue-300 p-2 rounded text-[11px] overflow-x-auto"><code>{ep.body}</code></pre>
                                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={() => handleCopy(ep.body || '', epId)}>
                                  {copiedCode === epId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </div>
                            </div>
                          )}
                          {ep.response && (
                            <div>
                              <p className="text-[10px] text-slate-500 font-semibold mb-1 uppercase">Response</p>
                              <pre className="bg-slate-900 text-emerald-300 p-2 rounded text-[11px] overflow-x-auto"><code>{ep.response}</code></pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Webhook Configuration Guide */}
      <Card className="border-slate-200 mt-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-500" /> Configuración de Webhooks por Canal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1">💬 WhatsApp Business</p>
              <p className="text-xs text-green-700 mt-1">URL del Webhook: <code className="bg-green-100 px-1 rounded">/api/webhook/whatsapp</code></p>
              <p className="text-xs text-green-600 mt-1">Configura esta URL en tu WhatsApp Business API Dashboard</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-1">💬 Facebook Messenger</p>
              <p className="text-xs text-blue-700 mt-1">URL del Webhook: <code className="bg-blue-100 px-1 rounded">/api/webhook/messenger</code></p>
              <p className="text-xs text-blue-600 mt-1">Configura en Facebook Developers → Webhooks</p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
              <p className="text-sm font-semibold text-pink-800 flex items-center gap-1">📸 Instagram Direct</p>
              <p className="text-xs text-pink-700 mt-1">URL del Webhook: <code className="bg-pink-100 px-1 rounded">/api/webhook/instagram</code></p>
              <p className="text-xs text-pink-600 mt-1">Configura en Meta for Developers → Instagram</p>
            </div>
            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
              <p className="text-sm font-semibold text-cyan-800 flex items-center gap-1">✈️ Telegram Bot</p>
              <p className="text-xs text-cyan-700 mt-1">URL del Webhook: <code className="bg-cyan-100 px-1 rounded">/api/webhook/telegram</code></p>
              <p className="text-xs text-cyan-600 mt-1">Configura con @BotFather → setWebhook</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
