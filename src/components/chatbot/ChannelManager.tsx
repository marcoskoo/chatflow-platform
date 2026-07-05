'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useChatbotStore } from '@/lib/store'
import { api } from '@/lib/api-client'
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/chatbot/ui'
import {
  Radio, Wifi, WifiOff, Settings, Check, ExternalLink, Key, Shield, Zap, RefreshCw,
} from 'lucide-react'

interface WebhookStatus {
  isActive: boolean
  hasCredentials: boolean
}

const channelDetails: Record<string, { name: string; icon: string; color: string; description: string; features: string[] }> = {
  whatsapp: {
    name: 'WhatsApp Business',
    icon: '💬',
    color: 'bg-green-500',
    description: 'Conecta tu WhatsApp Business API para automatizar conversaciones con tus clientes en la plataforma de mensajería más popular del mundo.',
    features: ['Mensajes con botones', 'Plantillas de mensajes', 'Etiquetas de conversación', 'Respuestas rápidas', 'Catálogo de productos'],
  },
  messenger: {
    name: 'Facebook Messenger',
    icon: '💬',
    color: 'bg-blue-500',
    description: 'Integra tu página de Facebook para automatizar respuestas en Messenger, capturar leads y proporcionar soporte 24/7.',
    features: ['Botones persistentes', 'Menú persistente', 'Plantillas genéricas', 'Quick Replies', 'Webview integrado'],
  },
  instagram: {
    name: 'Instagram Direct',
    icon: '📸',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Automatiza tus mensajes directos de Instagram, responde a comentarios y gestiona interacciones con tu audiencia.',
    features: ['Respuestas a DMs', 'Auto-respuesta a comentarios', 'Stories mentions', 'Quick Replies', 'Etiquetas de conversación'],
  },
  telegram: {
    name: 'Telegram Bot',
    icon: '✈️',
    color: 'bg-cyan-500',
    description: 'Crea bots de Telegram potentes con menús personalizados, comandos y automatización de flujos conversacionales.',
    features: ['Inline keyboards', 'Comandos personalizados', 'Callbacks de botones', 'Pagos integrados', 'Stickers y media'],
  },
}

export function ChannelManager() {
  const { channels, refreshChannels, refreshTeams, teams, loading } = useChatbotStore()
  const [webhookStatus, setWebhookStatus] = useState<Record<string, WebhookStatus>>({})
  const [loadingWebhooks, setLoadingWebhooks] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWebhookStatus = useCallback(async () => {
    setLoadingWebhooks(true)
    try {
      const configs = await api.listWebhookConfigs() as Array<Record<string, unknown>>
      const map: Record<string, WebhookStatus> = {}
      for (const c of configs) {
        const channel = c.channel as string
        const hasAny = !!(
          c.accessToken || c.botToken || c.verifyToken || c.appSecret ||
          c.phoneNumberId || c.pageId || c.webhookSecret
        )
        map[channel] = {
          isActive: !!c.isActive,
          hasCredentials: hasAny,
        }
      }
      setWebhookStatus(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar estado de webhooks')
    } finally {
      setLoadingWebhooks(false)
    }
  }, [])

  useEffect(() => {
    refreshChannels()
    refreshTeams()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWebhookStatus()
  }, [refreshChannels, refreshTeams, loadWebhookStatus])

  const handleToggle = async (id: string, channelType: string, connected: boolean) => {
    // Update local state immediately
    try {
      // We don't have a PATCH /api/channels/[id] endpoint, but we can update via the channels table if needed
      // For now, just update the connected status visually (already in store)
      // Note: actual channel connection status is determined by webhook config isActive
      console.log('Toggle channel', id, channelType, !connected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar canal')
    }
  }

  const openSecurityPanel = () => {
    useChatbotStore.getState().setCurrentView('security')
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Canales de Comunicación</h1>
          <p className="text-slate-500 mt-1 text-sm">Conecta y gestiona tus canales de mensajería para automatizar conversaciones</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refreshChannels(); loadWebhookStatus() }} disabled={loading.channels || loadingWebhooks}>
          <RefreshCw className={`w-4 h-4 ${(loading.channels || loadingWebhooks) ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.length === 0 && loading.channels ? (
          <div className="col-span-2 text-center py-12 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando canales…</p>
          </div>
        ) : channels.map((channel) => {
          const details = channelDetails[channel.type]
          if (!details) return null
          const status = webhookStatus[channel.type] || { isActive: false, hasCredentials: false }
          const isConnected = status.hasCredentials && status.isActive

          return (
            <Card key={channel.id} className={`border-2 transition-all ${isConnected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${details.color} text-white flex items-center justify-center text-2xl shadow-lg`}>
                      {details.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {details.name}
                        {isConnected ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                            <Wifi className="w-3 h-3 mr-1" /> Conectado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <WifiOff className="w-3 h-3 mr-1" /> Desconectado
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  <Switch
                    checked={isConnected}
                    onCheckedChange={() => handleToggle(channel.id, channel.type, isConnected)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-slate-600 mb-3">{details.description}</p>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Características</p>
                  <div className="flex flex-wrap gap-1.5">
                    {details.features.map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 bg-white rounded-full text-slate-600 border border-slate-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-500" /> {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Webhook URL display */}
                <div className="p-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 mb-3 break-all">
                  <span className="text-slate-400">Webhook URL:</span>{' '}
                  {typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.vercel.app'}/api/webhook/{channel.type}
                </div>

                <Button
                  variant={status.hasCredentials ? "default" : "outline"}
                  size="sm"
                  className="w-full gap-1"
                  onClick={openSecurityPanel}
                >
                  <Settings className="w-4 h-4" />
                  {status.hasCredentials ? 'Editar configuración' : 'Configurar credenciales'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg sm:text-xl">
            🚀
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base sm:text-lg text-slate-900">Conecta más canales</h3>
            <p className="text-sm text-slate-600 mt-1">
              Amplía tu alcance conectando múltiples canales. Cada canal te permite automatizar conversaciones
              en una plataforma diferente, llegando a tus clientes donde sea que estén.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-green-100 text-green-700">WhatsApp: 2B+ usuarios</Badge>
              <Badge className="bg-blue-100 text-blue-700">Messenger: 1.3B+ usuarios</Badge>
              <Badge className="bg-pink-100 text-pink-700">Instagram: 2B+ usuarios</Badge>
              <Badge className="bg-cyan-100 text-cyan-700">Telegram: 700M+ usuarios</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={openSecurityPanel} className="gap-1">
                <Shield className="w-3.5 h-3.5" /> Ir a configuración de webhooks
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
