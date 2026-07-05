'use client'

import React, { useState, useEffect } from 'react'
import { useChatbotStore, type Bot, type Flow, type FlowNode } from '@/lib/store'
import { api } from '@/lib/api-client'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/chatbot/ui'
import { Plus, Bot as BotIcon, Zap, Radio, Trash2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export function BotList() {
  const {
    bots, selectBot, setCurrentView, selectFlow,
    createBotViaApi, deleteBotViaApi, refreshBots, loading,
  } = useChatbotStore()
  const [showNewBot, setShowNewBot] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [newBotDesc, setNewBotDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { refreshBots() }, [refreshBots])

  const channelIcons: Record<string, string> = {
    whatsapp: '💬', messenger: '💬', instagram: '📸', telegram: '✈️',
  }

  const handleCreateBot = async () => {
    if (!newBotName.trim()) return
    setCreating(true); setError(null)
    try {
      // 1. Create the bot
      const bot = await createBotViaApi({
        name: newBotName.trim(),
        description: newBotDesc.trim() || undefined,
        channels: [],
      })

      // 2. Create a default flow for it
      const startNode: FlowNode = {
        id: uuidv4(),
        type: 'start',
        position: { x: 100, y: 200 },
        data: { label: 'Inicio' },
      }
      const welcomeNode: FlowNode = {
        id: uuidv4(),
        type: 'message',
        position: { x: 400, y: 200 },
        data: { label: 'Bienvenida', content: '¡Hola! ¿En qué puedo ayudarte?' },
      }
      await api.createFlow(bot.id, {
        name: 'Flujo Principal',
        nodes: [startNode, welcomeNode],
        edges: [{ id: uuidv4(), source: startNode.id, target: welcomeNode.id }],
        trigger: { type: 'first_message' },
        isActive: true,
      })

      await refreshBots()
      setNewBotName('')
      setNewBotDesc('')
      setShowNewBot(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear bot')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este chatbot? Se borrarán también todos sus flujos.')) return
    try {
      await deleteBotViaApi(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar bot')
    }
  }

  const handleOpenBuilder = (botId: string, flowId: string) => {
    selectBot(botId)
    selectFlow(flowId)
    setCurrentView('builder')
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mis Chatbots</h1>
          <p className="text-slate-500 mt-1 text-sm">Gestiona y crea tus chatbots con IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshBots()} disabled={loading.bots}>
            <RefreshCw className={`w-4 h-4 ${loading.bots ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setShowNewBot(true)}>
            <Plus className="w-4 h-4" />
            Nuevo Chatbot
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading.bots && bots.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Cargando chatbots…</p>
        </div>
      ) : bots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BotIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No tienes chatbots todavía</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setShowNewBot(true)}>
              <Plus className="w-4 h-4" /> Crear mi primer chatbot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-lg transition-all border-slate-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <BotIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{bot.name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{bot.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <Badge variant={bot.status === 'active' ? 'default' : 'secondary'} className={bot.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                    {bot.status === 'active' ? 'Activo' : 'Borrador'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {bot.channels.map((ch) => (
                    <span key={ch} className="text-xs bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1">
                      {channelIcons[ch] || '📡'} {ch}
                    </span>
                  ))}
                  {bot.channels.length === 0 && (
                    <span className="text-xs text-slate-400">Sin canales configurados</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {bot.flows.length} flujo{bot.flows.length !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> {bot.channels.length} canal{bot.channels.length !== 1 ? 'es' : ''}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {bot.flows.map((flow) => (
                    <Button
                      key={flow.id}
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 min-w-[120px]"
                      onClick={() => handleOpenBuilder(bot.id, flow.id)}
                    >
                      <Zap className="w-3 h-3" />
                      <span className="truncate">{flow.name}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    </Button>
                  ))}
                  {bot.flows.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Sin flujos — abre el constructor para crear uno</span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    onClick={() => handleDelete(bot.id)}
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {new Date(bot.updatedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New bot dialog */}
      <Dialog open={showNewBot} onOpenChange={setShowNewBot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Chatbot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre del chatbot</label>
              <Input
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Ej: Asistente de Ventas"
                className="border-slate-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Descripción</label>
              <Input
                value={newBotDesc}
                onChange={(e) => setNewBotDesc(e.target.value)}
                placeholder="Describe la función de tu chatbot"
                className="border-slate-300"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600">{error}</p>
            )}
            <Button
              onClick={handleCreateBot}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!newBotName.trim() || creating}
            >
              {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {creating ? 'Creando…' : 'Crear Chatbot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
