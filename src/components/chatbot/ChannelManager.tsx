'use client'

import React, { useState } from 'react'
import { useChatbotStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Switch, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/chatbot/ui'
import { Radio, Wifi, WifiOff, Settings, Plus, Check, ExternalLink, Key, Shield, Zap } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

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
  const { channels, updateChannel } = useChatbotStore()
  const [showConfig, setShowConfig] = useState<string | null>(null)
  const [configToken, setConfigToken] = useState('')
  const [configWebhook, setConfigWebhook] = useState('')

  const handleToggle = (id: string, connected: boolean) => {
    updateChannel(id, { connected: !connected })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Canales de Comunicación</h1>
        <p className="text-slate-500 mt-1">Conecta y gestiona tus canales de mensajería para automatizar conversaciones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => {
          const details = channelDetails[channel.type]
          if (!details) return null

          return (
            <Card key={channel.id} className={`border-2 transition-all ${channel.connected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${details.color} text-white flex items-center justify-center text-2xl shadow-lg`}>
                      {details.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {details.name}
                        {channel.connected ? (
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
                    checked={channel.connected}
                    onCheckedChange={() => handleToggle(channel.id, channel.connected)}
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

                <Dialog open={showConfig === channel.id} onOpenChange={(open) => setShowConfig(open ? channel.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-1 mt-2" disabled={!channel.connected}>
                      <Settings className="w-4 h-4" /> Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">{details.icon}</span>
                        Configurar {details.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                          <Key className="w-4 h-4" /> Token / API Key
                        </label>
                        <Input
                          value={configToken}
                          onChange={(e) => setConfigToken(e.target.value)}
                          placeholder="Pega tu token aquí..."
                          type="password"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Webhook URL
                        </label>
                        <Input
                          value={configWebhook}
                          onChange={(e) => setConfigWebhook(e.target.value)}
                          placeholder="https://tu-servidor.com/webhook"
                        />
                        <p className="text-xs text-slate-400 mt-1">URL donde se enviarán los eventos del canal</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                          <Zap className="w-4 h-4" /> Verificación
                        </label>
                        <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                          ✓ Canal verificado y listo para recibir mensajes
                        </div>
                      </div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Guardar Configuración
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl">
            🚀
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Conecta más canales</h3>
            <p className="text-sm text-slate-600 mt-1">
              Amplía tu alcance conectando múltiples canales. Cada canal te permite automatizar conversaciones
              en una plataforma diferente, llegando a tus clientes donde sea que estén.
            </p>
            <div className="flex gap-2 mt-3">
              <Badge className="bg-green-100 text-green-700">WhatsApp: 2B+ usuarios</Badge>
              <Badge className="bg-blue-100 text-blue-700">Messenger: 1.3B+ usuarios</Badge>
              <Badge className="bg-pink-100 text-pink-700">Instagram: 2B+ usuarios</Badge>
              <Badge className="bg-cyan-100 text-cyan-700">Telegram: 700M+ usuarios</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
