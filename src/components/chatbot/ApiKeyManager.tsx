'use client'

import React, { useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Switch, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/chatbot/ui'
import {
  Key, Plus, Trash2, Copy, Check, Shield, Eye, EyeOff, AlertTriangle,
  Globe, Save, RefreshCw, ExternalLink, Lock, Unlock, Clock, Zap,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface ApiKeyItem {
  id: string
  name: string
  permissions: string[]
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

interface WebhookConfigItem {
  id: string
  channel: string
  verifyToken: string | null
  accessToken: string | null
  appSecret: string | null
  phoneNumberId: string | null
  pageId: string | null
  botToken: string | null
  webhookSecret: string | null
  apiVersion: string | null
  baseUrl: string | null
  isActive: boolean
}

const channelMeta: Record<string, { name: string; icon: string; color: string; fields: string[] }> = {
  whatsapp: {
    name: 'WhatsApp Business',
    icon: '💬',
    color: 'bg-green-500',
    fields: ['accessToken', 'phoneNumberId', 'verifyToken', 'appSecret', 'apiVersion'],
  },
  messenger: {
    name: 'Facebook Messenger',
    icon: '💬',
    color: 'bg-blue-500',
    fields: ['accessToken', 'pageId', 'verifyToken', 'appSecret', 'apiVersion'],
  },
  instagram: {
    name: 'Instagram Direct',
    icon: '📸',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    fields: ['accessToken', 'pageId', 'verifyToken', 'appSecret', 'apiVersion'],
  },
  telegram: {
    name: 'Telegram Bot',
    icon: '✈️',
    color: 'bg-cyan-500',
    fields: ['botToken', 'webhookSecret', 'baseUrl'],
  },
}

const fieldLabels: Record<string, { label: string; placeholder: string; icon: React.ReactNode; secret?: boolean }> = {
  accessToken: { label: 'Access Token / Page Token', placeholder: 'EAAx...', icon: <Key className="w-4 h-4" />, secret: true },
  phoneNumberId: { label: 'Phone Number ID', placeholder: '1234567890', icon: <Zap className="w-4 h-4" /> },
  pageId: { label: 'Page ID', placeholder: '123456789', icon: <Globe className="w-4 h-4" /> },
  verifyToken: { label: 'Verify Token (webhook verification)', placeholder: 'my_custom_verify_token', icon: <Shield className="w-4 h-4" /> },
  appSecret: { label: 'App Secret', placeholder: 'abc123def456...', icon: <Lock className="w-4 h-4" />, secret: true },
  botToken: { label: 'Bot Token', placeholder: '123456:ABC-DEF...', icon: <Key className="w-4 h-4" />, secret: true },
  webhookSecret: { label: 'Webhook Secret Token', placeholder: 'Optional secret for validation', icon: <Shield className="w-4 h-4" /> },
  apiVersion: { label: 'API Version', placeholder: 'v18.0', icon: <RefreshCw className="w-4 h-4" /> },
  baseUrl: { label: 'Custom API Base URL', placeholder: 'https://api.telegram.org (default)', icon: <Globe className="w-4 h-4" /> },
}

const permissionOptions = [
  { value: 'read', label: 'Lectura', description: 'Ver datos y listados' },
  { value: 'write', label: 'Escritura', description: 'Crear y modificar datos, usar IA' },
  { value: 'admin', label: 'Admin', description: 'Gestionar API keys y configuracion' },
]

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    { id: 'demo-1', name: 'App Principal', permissions: ['read', 'write', 'admin'], isActive: true, lastUsedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'demo-2', name: 'Webhook Service', permissions: ['read', 'webhooks'], isActive: true, lastUsedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString() },
  ])
  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfigItem[]>([
    { id: 'wc-1', channel: 'whatsapp', verifyToken: null, accessToken: null, appSecret: null, phoneNumberId: null, pageId: null, botToken: null, webhookSecret: null, apiVersion: 'v18.0', baseUrl: null, isActive: false },
    { id: 'wc-2', channel: 'messenger', verifyToken: null, accessToken: null, appSecret: null, phoneNumberId: null, pageId: null, botToken: null, webhookSecret: null, apiVersion: 'v18.0', baseUrl: null, isActive: false },
    { id: 'wc-3', channel: 'instagram', verifyToken: null, accessToken: null, appSecret: null, phoneNumberId: null, pageId: null, botToken: null, webhookSecret: null, apiVersion: 'v18.0', baseUrl: null, isActive: false },
    { id: 'wc-4', channel: 'telegram', verifyToken: null, accessToken: null, appSecret: null, phoneNumberId: null, pageId: null, botToken: null, webhookSecret: null, apiVersion: null, baseUrl: null, isActive: false },
  ])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['read', 'write'])
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [webhookForm, setWebhookForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    const rawKey = `cf_${Array.from({ length: 64 }, () => Math.random().toString(16)[2]).join('')}`
    const newKey: ApiKeyItem = {
      id: uuidv4(),
      name: newKeyName.trim(),
      permissions: newKeyPerms,
      isActive: true,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    }
    setApiKeys([...apiKeys, newKey])
    setNewlyCreatedKey(rawKey)
    setNewKeyName('')
    setNewKeyPerms(['read', 'write'])
  }

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id))
  }

  const handleToggleKey = (id: string) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k))
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleEditWebhook = (channel: string) => {
    const existing = webhookConfigs.find(w => w.channel === channel)
    if (existing) {
      const form: Record<string, string> = {}
      for (const field of channelMeta[channel].fields) {
        const val = existing[field as keyof WebhookConfigItem] as string | null
        form[field] = val || ''
      }
      setWebhookForm(form)
    } else {
      setWebhookForm({})
    }
    setEditingChannel(channel)
  }

  const handleSaveWebhook = () => {
    if (!editingChannel) return
    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setWebhookConfigs(webhookConfigs.map(w => {
        if (w.channel === editingChannel) {
          const updated = { ...w }
          for (const field of channelMeta[editingChannel].fields) {
            const val = webhookForm[field]
            ;(updated as Record<string, unknown>)[field] = val || null
          }
          updated.isActive = Object.values(webhookForm).some(v => v.trim() !== '')
          return updated
        }
        return w
      }))
      setSaving(false)
      setEditingChannel(null)
      setWebhookForm({})
    }, 800)
  }

  const formatDate = (d: string | null) => {
    if (!d) return 'Nunca'
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const permColor = (p: string) => {
    switch (p) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'write': return 'bg-blue-100 text-blue-700'
      case 'read': return 'bg-emerald-100 text-emerald-700'
      case 'webhooks': return 'bg-cyan-100 text-cyan-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-500" /> Seguridad & API
        </h1>
        <p className="text-slate-500 mt-1">Gestiona API keys para proteger tus endpoints y configura webhooks reales con cada plataforma</p>
      </div>

      <Tabs defaultValue="apikeys" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="apikeys" className="gap-2">
            <Key className="w-4 h-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Globe className="w-4 h-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <ExternalLink className="w-4 h-4" /> Documentacion
          </TabsTrigger>
        </TabsList>

        {/* ─── API KEYS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="apikeys" className="space-y-4">
          {/* Alert banner */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Autenticacion requerida para todos los endpoints</p>
                <p className="text-xs text-amber-700 mt-1">
                  Todas las rutas API requieren un API key via <code className="bg-amber-100 px-1 rounded">Authorization: Bearer cf_xxx</code> o
                  <code className="bg-amber-100 px-1 rounded">x-api-key: cf_xxx</code>. Los webhooks entrantes usan verificacion de firma HMAC.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Create new key */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">API Keys</h2>
              <p className="text-xs text-slate-500">{apiKeys.length} keys activas</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" /> Nueva API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre</label>
                    <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Ej: Mi Aplicacion Movil" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Permisos</label>
                    <div className="space-y-2">
                      {permissionOptions.map(p => (
                        <label key={p.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newKeyPerms.includes(p.value)}
                            onChange={(e) => {
                              if (e.target.checked) setNewKeyPerms([...newKeyPerms, p.value])
                              else setNewKeyPerms(newKeyPerms.filter(x => x !== p.value))
                            }}
                            className="rounded border-slate-300"
                          />
                          <div>
                            <span className="text-sm font-medium">{p.label}</span>
                            <span className="text-xs text-slate-500 ml-2">({p.description})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateKey} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!newKeyName.trim()}>
                    Generar API Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Newly created key display */}
          {newlyCreatedKey && (
            <Card className="border-2 border-emerald-300 bg-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">API Key creada exitosamente!</p>
                    <p className="text-xs text-emerald-700 mt-1">Guarda esta key de forma segura. No se podra volver a mostrar.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-mono text-slate-800 border border-emerald-200 break-all">
                        {newlyCreatedKey}
                      </code>
                      <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => handleCopyKey(newlyCreatedKey)}>
                        {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" className="mt-2 text-emerald-700" onClick={() => setNewlyCreatedKey(null)}>
                      Cerrar (la key ya no sera visible)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Keys list */}
          <div className="space-y-2">
            {apiKeys.map(key => (
              <Card key={key.id} className={`border ${key.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${key.isActive ? 'bg-violet-100' : 'bg-slate-100'} flex items-center justify-center`}>
                        <Key className={`w-5 h-5 ${key.isActive ? 'text-violet-500' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900">{key.name}</span>
                          <Badge className={`text-[9px] ${key.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {key.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {key.permissions.map(p => (
                            <Badge key={p} className={`text-[9px] ${permColor(p)}`}>{p}</Badge>
                          ))}
                          <span className="text-[10px] text-slate-400 ml-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Ultimo uso: {formatDate(key.lastUsedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={key.isActive} onCheckedChange={() => handleToggleKey(key.id)} />
                      <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteKey(key.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage example */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ejemplo de uso con cURL</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto">
{`# Usando Bearer Token
curl -X GET http://localhost:3000/api/bots \\
  -H "Authorization: Bearer cf_tu_api_key_aqui"

# Usando x-api-key header
curl -X POST http://localhost:3000/api/ai/chat \\
  -H "x-api-key: cf_tu_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hola", "botName": "Asistente"}'`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WEBHOOKS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Webhooks con APIs reales de cada plataforma</p>
                <p className="text-xs text-blue-700 mt-1">
                  Configura las credenciales de cada plataforma para recibir y enviar mensajes reales.
                  Los webhooks entrantes verifican firmas HMAC automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhookConfigs.map(config => {
              const meta = channelMeta[config.channel]
              const isConfigured = config.isActive
              const isEditing = editingChannel === config.channel

              return (
                <Card key={config.id} className={`border-2 transition-all ${isConfigured ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl ${meta.color} text-white flex items-center justify-center text-xl shadow-lg`}>
                          {meta.icon}
                        </div>
                        <div>
                          <CardTitle className="text-sm">{meta.name}</CardTitle>
                          <Badge className={`text-[10px] mt-1 ${isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isConfigured ? 'Configurado' : 'Sin configurar'}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleEditWebhook(config.channel)}>
                        <Save className="w-4 h-4 mr-1" /> Config
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="p-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 mb-3">
                      <span className="text-slate-400">Webhook URL:</span> /api/webhook/{config.channel}
                    </div>
                    {isConfigured && (
                      <div className="space-y-1">
                        {meta.fields.filter(f => (config as Record<string, unknown>)[f]).map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-slate-600">{fieldLabels[f]?.label || f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Webhook config dialog */}
          <Dialog open={!!editingChannel} onOpenChange={(open) => { if (!open) setEditingChannel(null) }}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{editingChannel && channelMeta[editingChannel]?.icon}</span>
                  Configurar {editingChannel && channelMeta[editingChannel]?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {editingChannel && channelMeta[editingChannel]?.fields.map(field => {
                  const meta = fieldLabels[field]
                  if (!meta) return null
                  const isSecret = meta.secret
                  const isVisible = showSecrets[field]
                  return (
                    <div key={field}>
                      <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                        {meta.icon} {meta.label}
                      </label>
                      <div className="relative">
                        <Input
                          value={webhookForm[field] || ''}
                          onChange={(e) => setWebhookForm({ ...webhookForm, [field]: e.target.value })}
                          placeholder={meta.placeholder}
                          type={isSecret && !isVisible ? 'password' : 'text'}
                          className={isSecret ? 'pr-10' : ''}
                        />
                        {isSecret && (
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowSecrets({ ...showSecrets, [field]: !isVisible })}
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Webhook URL info */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 mb-1">URL del Webhook para configurar en la plataforma:</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border text-emerald-600 font-mono">
                    https://tu-servidor.com/api/webhook/{editingChannel}
                  </code>
                  {editingChannel === 'telegram' && (
                    <p className="text-[10px] text-slate-500 mt-2">
                      Para Telegram, configura el webhook ejecutando:
                      <code className="block bg-white px-2 py-1 rounded border text-xs mt-1">
                        https://api.telegram.org/bot{'<TOKEN>'}/setWebhook?url=https://tu-servidor.com/api/webhook/telegram
                      </code>
                    </p>
                  )}
                  {(editingChannel === 'whatsapp' || editingChannel === 'messenger' || editingChannel === 'instagram') && (
                    <p className="text-[10px] text-slate-500 mt-2">
                      En Meta Developers, configura esta URL como webhook y usa el Verify Token que definiste arriba.
                      Suscribete a los eventos: messages, messaging_postbacks.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveWebhook} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? 'Guardando...' : 'Guardar Configuracion'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingChannel(null)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── DOCS TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" /> Sistema de Autenticacion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                <p className="text-xs font-semibold text-violet-800 mb-1">Como funciona</p>
                <ul className="text-xs text-violet-700 space-y-1 list-disc pl-4">
                  <li>Las API keys se generan con un hash SHA-256 y se almacenan de forma segura</li>
                  <li>Se envian via <code className="bg-violet-100 px-1 rounded">Authorization: Bearer</code> o <code className="bg-violet-100 px-1 rounded">x-api-key</code></li>
                  <li>Cada key tiene permisos: read (GET), write (POST/PATCH), admin (DELETE/keys)</li>
                  <li>Los webhooks entrantes NO requieren API key - se validan con firma HMAC</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-semibold text-amber-800 mb-1">Permisos por endpoint</p>
                <div className="text-xs text-amber-700 space-y-1">
                  <p><Badge className="text-[9px] bg-emerald-100 text-emerald-700">read</Badge> GET /api/bots, conversations, channels, teams, messages</p>
                  <p><Badge className="text-[9px] bg-blue-100 text-blue-700">write</Badge> POST/PATCH bots, conversations, messages, tags, notes, transfer, ai/chat, send/*</p>
                  <p><Badge className="text-[9px] bg-red-100 text-red-700">admin</Badge> DELETE bots, api/keys/*, webhook-config/*</p>
                  <p><Badge className="text-[9px] bg-cyan-100 text-cyan-700">sin auth</Badge> POST /api/webhook/* (firma HMAC verificada), GET /api (info publica)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-500" /> Webhook Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs font-semibold text-green-800">WhatsApp / Meta</p>
                  <p className="text-[10px] text-green-700 mt-1">
                    Verificacion via <code className="bg-green-100 px-1 rounded">hub.challenge</code> con verify_token.
                    Firma HMAC-SHA1 en header <code className="bg-green-100 px-1 rounded">X-Hub-Signature-256</code> verificada con App Secret.
                  </p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                  <p className="text-xs font-semibold text-cyan-800">Telegram</p>
                  <p className="text-[10px] text-cyan-700 mt-1">
                    Verificacion via <code className="bg-cyan-100 px-1 rounded">secret_token</code> header configurado con setWebhook.
                    Firma HMAC-SHA256 del bot token validada automaticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" /> Enviar Mensajes (Send API)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto">
{`# Enviar mensaje con botones por WhatsApp
curl -X POST /api/send/whatsapp \\
  -H "Authorization: Bearer cf_tu_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipientId": "+521234567890",
    "message": "Selecciona una opcion:",
    "buttons": [
      { "id": "b1", "text": "Mi pedido" },
      { "id": "b2", "text": "Pagos" },
      { "id": "b3", "text": "Agente" }
    ],
    "conversationId": "conv-123"
  }'

# Enviar mensaje por Telegram
curl -X POST /api/send/telegram \\
  -H "Authorization: Bearer cf_tu_api_key" \\
  -d '{
    "recipientId": "123456789",
    "message": "Hola! Como puedo ayudarte?",
    "buttons": [{ "id": "help", "text": "Ayuda" }]
  }'`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
