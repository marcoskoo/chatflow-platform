'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import {
  Button, Input, Textarea, Badge, Card, CardHeader, CardTitle, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/chatbot/ui'
import {
  RefreshCw, Plus, Trash2, Send, Download, Upload, Search,
  Megaphone, BarChart3, BookOpen, Plug, FlaskConical, Store,
  Lock, CreditCard, Phone, Building2, ScrollText, Users,
  Star, ExternalLink, Loader2,
} from 'lucide-react'

// ─── Shared helpers ────────────────────────────────────────────────────────

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-4">{description}</p>
      {action}
    </div>
  )
}

const safe = (v: unknown) => Array.isArray(v) ? v : []
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {}

// ─── Contacts CRM ──────────────────────────────────────────────────────────

export function ContactsPanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', channel: 'whatsapp', language: 'es' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listContacts({ q })
      setItems(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await api.createContact(form)
    setShowCreate(false)
    setForm({ name: '', email: '', phone: '', channel: 'whatsapp', language: 'es' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar contacto?')) return
    await api.deleteContact(id)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Contactos CRM"
        subtitle="Perfiles unificados multi-canal con atributos y tags"
        action={
          <div className="flex gap-2">
            <a href={api.exportContactsUrl()} download>
              <Button variant="outline" size="sm" className="gap-1"><Download className="w-4 h-4" /> Exportar</Button>
            </a>
            <Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo</Button>
          </div>
        }
      />
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email, teléfono..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="Sin contactos"
            description="Los contactos se crean automáticamente cuando un usuario escribe a tus bots, o puedes importarlos manualmente."
            action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Crear contacto</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                const r = obj(c)
                const tags = safe(JSON.parse((r.tags as string) || '[]')) as string[]
                return (
                  <TableRow key={r.id as string}>
                    <TableCell className="font-medium">{(r.name as string) || '—'}</TableCell>
                    <TableCell>{(r.email as string) || '—'}</TableCell>
                    <TableCell>{(r.phone as string) || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{(r.channel as string) || '—'}</Badge></TableCell>
                    <TableCell>{(r.language as string) || 'es'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {tags.map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{new Date(r.createdAt as string).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id as string)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleCreate}>Crear contacto</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Broadcasts ────────────────────────────────────────────────────────────

export function BroadcastsPanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', channel: 'whatsapp', message: '', scheduledAt: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.listBroadcasts()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await api.createBroadcast({
      name: form.name,
      channel: form.channel,
      message: form.message,
      scheduledAt: form.scheduledAt || undefined,
    })
    setShowCreate(false)
    setForm({ name: '', channel: 'whatsapp', message: '', scheduledAt: '' })
    load()
  }

  const handleSend = async (id: string) => {
    if (!confirm('¿Enviar ahora a todos los contactos del segmento?')) return
    try {
      const r = await api.sendBroadcast(id)
      alert(`Enviado: ${obj(r).sent ?? 0} contactos, ${obj(r).failed ?? 0} fallidos`)
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Campañas y Broadcast"
        subtitle="Envíos masivos a segmentos de contactos con programación"
        action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nueva campaña</Button>}
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="w-7 h-7" />}
            title="Sin campañas"
            description="Crea una campaña para enviar un mensaje masivo a todos los contactos de un canal y segmento."
            action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nueva campaña</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((b) => {
              const r = obj(b)
              const status = r.status as string
              const statusColor = status === 'sent' ? 'bg-emerald-100 text-emerald-700'
                : status === 'scheduled' ? 'bg-amber-100 text-amber-700'
                : status === 'sending' ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-700'
              return (
                <Card key={r.id as string}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{r.name as string}</CardTitle>
                        <Badge variant="secondary" className="mt-1">{r.channel as string}</Badge>
                      </div>
                      <Badge className={statusColor}>{status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600 line-clamp-3">{r.message as string}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Enviados: {r.totalSent as number ?? 0}</span>
                      <span>Leídos: {r.totalRead as number ?? 0}</span>
                    </div>
                    {status === 'draft' && (
                      <Button size="sm" className="w-full gap-1" onClick={() => handleSend(r.id as string)}>
                        <Send className="w-4 h-4" /> Enviar ahora
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva campaña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
            <Textarea rows={4} placeholder="Mensaje a enviar" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            <p className="text-xs text-slate-500">Deja la fecha vacía para guardar como borrador.</p>
            <Button className="w-full" onClick={handleCreate}>Crear campaña</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export function AnalyticsPanel() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalytics()
      .then((d) => setData(obj(d)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  if (!data) return <EmptyState icon={<BarChart3 className="w-7 h-7" />} title="Sin datos" description="Aún no hay métricas disponibles." />

  const channelData = obj(data.conversationsByChannel)
  const csatDist = obj(data.csatDistribution)
  const messagesOverTime = safe(data.messagesOverTime) as Array<{ date: string; count: number }>

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Analítica" subtitle="Métricas de bots, canales, conversaciones y CSAT" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Conversaciones</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.totalConversations as number}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Mensajes</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.totalMessages as number}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Bots activos</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.activeBots as number}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-slate-500">CSAT promedio</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.csatAvg as number} ★</div></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Conversaciones por canal</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(channelData).map(([ch, n]) => {
                  const max = Math.max(...Object.values(channelData) as number[], 1)
                  return (
                    <div key={ch}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{ch}</span>
                        <span className="text-slate-500">{n as number}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((n as number) / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribución CSAT</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end justify-around h-40 gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const count = (csatDist[String(star) as string] as number) || 0
                  const max = Math.max(...Object.values(csatDist) as number[], 1)
                  return (
                    <div key={star} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-xs text-slate-500">{count}</div>
                      <div
                        className="w-full bg-amber-400 rounded-t"
                        style={{ height: `${(count / max) * 100}%`, minHeight: '4px' }}
                      />
                      <div className="text-sm">{star}★</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Mensajes en el tiempo</CardTitle></CardHeader>
          <CardContent>
            {messagesOverTime.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Sin datos suficientes</p>
            ) : (
              <div className="flex items-end gap-1 h-48">
                {messagesOverTime.slice(-30).map((m) => {
                  const max = Math.max(...messagesOverTime.map((x) => x.count), 1)
                  return (
                    <div key={m.date} className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600" style={{ height: `${(m.count / max) * 100}%`, minHeight: '2px' }} title={`${m.date}: ${m.count}`} />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>SLA breaches</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{data.slaBreaches as number}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bot → Agente handoffs</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">{data.botHandoffs as number}</div></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Knowledge Base ────────────────────────────────────────────────────────

export function KnowledgePanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', source: 'manual', sourceUrl: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.listKnowledgeBase()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await api.createKnowledgeBase(form)
    setShowCreate(false)
    setForm({ title: '', content: '', source: 'manual', sourceUrl: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar documento?')) return
    await api.deleteKnowledgeBase(id)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Base de Conocimiento (RAG)"
        subtitle="Documentos que tus bots consultan para responder con IA"
        action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo documento</Button>}
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-7 h-7" />}
            title="Sin documentos"
            description="Sube PDFs, pega texto o enlaza URLs. La IA usará estos documentos para responder preguntas de los usuarios (RAG)."
            action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Añadir documento</Button>}
          />
        ) : (
          <div className="space-y-3">
            {items.map((k) => {
              const r = obj(k)
              return (
                <Card key={r.id as string}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{r.title as string}</CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary">{r.source as string}</Badge>
                            <Badge variant="outline">{(r.content as string)?.length ?? 0} chars</Badge>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id as string)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-3">{r.content as string}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Texto manual</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="docx">Documento</SelectItem>
              </SelectContent>
            </Select>
            {form.source === 'url' && (
              <Input placeholder="https://..." value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
            )}
            <Textarea rows={8} placeholder="Contenido del documento..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <Button className="w-full" onClick={handleCreate}>Guardar documento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Integrations ──────────────────────────────────────────────────────────

const INTEGRATION_TYPES = [
  { id: 'slack', name: 'Slack', desc: 'Notificaciones en canales de Slack' },
  { id: 'google_sheets', name: 'Google Sheets', desc: 'Sincronizar contactos y conversaciones' },
  { id: 'zapier', name: 'Zapier', desc: 'Conectar con 5000+ apps' },
  { id: 'make', name: 'Make (Integromat)', desc: 'Automatizaciones visuales' },
  { id: 'n8n', name: 'n8n', desc: 'Workflow automation self-hosted' },
  { id: 'hubspot', name: 'HubSpot CRM', desc: 'Sincronizar contactos y deals' },
  { id: 'salesforce', name: 'Salesforce', desc: 'Enterprise CRM sync' },
  { id: 'shopify', name: 'Shopify', desc: 'Órdenes, productos, clientes' },
  { id: 'woocommerce', name: 'WooCommerce', desc: 'E-commerce WordPress' },
  { id: 'stripe', name: 'Stripe', desc: 'Pagos y suscripciones' },
  { id: 'email', name: 'Email SMTP', desc: 'Enviar notificaciones por email' },
  { id: 'webhook', name: 'Webhook genérico', desc: 'POST a URL personalizada' },
]

export function IntegrationsPanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [webhooks, setWebhooks] = useState<unknown[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ints, whs] = await Promise.all([api.listIntegrations(), api.listOutgoingWebhooks()])
      setItems(ints)
      setWebhooks(whs)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAddIntegration = async (type: string, name: string) => {
    await api.createIntegration({ type, name, config: {}, events: ['message.received'] })
    load()
  }

  const handleDelete = async (id: string) => {
    await api.deleteIntegration(id)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Integraciones" subtitle="Conecta ChatFlow con tus herramientas externas" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Integraciones disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {INTEGRATION_TYPES.map((t) => {
                  const installed = items.find((i) => obj(i).type === t.id)
                  return (
                    <Card key={t.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-slate-900">{t.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                          </div>
                          {installed ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Instalado</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleAddIntegration(t.id, t.name)}>Instalar</Button>
                          )}
                        </div>
                        {installed ? (
                          <Button size="sm" variant="ghost" className="text-red-500 p-0 h-6" onClick={() => handleDelete(obj(installed).id as string)}>
                            Eliminar
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Webhooks salientes</h3>
              {webhooks.length === 0 ? (
                <p className="text-sm text-slate-500">Configura webhooks salientes para recibir eventos en tu propio servidor.</p>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((w) => {
                    const r = obj(w)
                    return (
                      <Card key={r.id as string}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{r.name as string}</div>
                            <div className="text-xs text-slate-500 font-mono">{r.url as string}</div>
                          </div>
                          <Badge variant="secondary">{r.method as string}</Badge>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── A/B Testing ───────────────────────────────────────────────────────────

export function ABTestingPanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.listABTests()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Tests A/B" subtitle="Compara variantes de flujos para optimizar conversión" />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="w-7 h-7" />}
            title="Sin tests A/B"
            description="Crea tests A/B para comparar dos variantes de un flujo y determinar cuál convierte mejor. Usa el nodo 'A/B Test' en el FlowBuilder."
          />
        ) : (
          <div className="space-y-3">
            {items.map((t) => {
              const r = obj(t)
              const aConv = r.variantAVisitors as number > 0
                ? ((r.variantAConversions as number) / (r.variantAVisitors as number)) * 100
                : 0
              const bConv = r.variantBVisitors as number > 0
                ? ((r.variantBConversions as number) / (r.variantBVisitors as number)) * 100
                : 0
              return (
                <Card key={r.id as string}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{r.name as string}</CardTitle>
                        <Badge variant="secondary" className="mt-1">{r.status as string}</Badge>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-slate-500">Tráfico A: {r.trafficSplit as number}%</div>
                        {r.winner ? <Badge className="bg-amber-100 text-amber-700 mt-1">Ganador: {r.winner as string}</Badge> : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Variante A</div>
                        <div className="text-2xl font-bold text-blue-600">{aConv.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500">{r.variantAConversions as number}/{r.variantAVisitors as number}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Variante B</div>
                        <div className="text-2xl font-bold text-purple-600">{bConv.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500">{r.variantBConversions as number}/{r.variantBVisitors as number}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Marketplace ───────────────────────────────────────────────────────────

const TEMPLATE_CATEGORIES = [
  { id: 'ecommerce', name: 'E-commerce' },
  { id: 'restaurant', name: 'Restaurantes' },
  { id: 'healthcare', name: 'Salud' },
  { id: 'banking', name: 'Banca' },
  { id: 'real_estate', name: 'Inmobiliaria' },
  { id: 'education', name: 'Educación' },
]

export function MarketplacePanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.listTemplates(category || undefined)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [category])

  useEffect(() => { load() }, [load])

  const handleInstall = async (id: string, name: string) => {
    const botName = prompt('Nombre del nuevo bot:', name)
    if (!botName) return
    try {
      await api.installTemplate(id, { botName })
      alert('Bot creado. Aparecerá en la sección Chatbots.')
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Marketplace de Plantillas" subtitle="Bots pre-construidos por industria, clónalos en 1 clic" />
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={!category ? 'default' : 'outline'} onClick={() => setCategory('')}>Todas</Button>
          {TEMPLATE_CATEGORIES.map((c) => (
            <Button key={c.id} size="sm" variant={category === c.id ? 'default' : 'outline'} onClick={() => setCategory(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Store className="w-7 h-7" />}
            title="Sin plantillas"
            description="Aún no hay plantillas publicadas en esta categoría. Próximamente añadiremos más."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((t) => {
              const r = obj(t)
              return (
                <Card key={r.id as string} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                    <Store className="w-12 h-12 text-emerald-600" />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{r.name as string}</CardTitle>
                      {r.isFeatured ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : null}
                    </div>
                    <Badge variant="secondary">{r.category as string}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{r.description as string}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>⬇ {r.downloads as number} downloads</span>
                      <span>★ {r.rating as number}</span>
                    </div>
                    <Button size="sm" className="w-full gap-1" onClick={() => handleInstall(r.id as string, r.name as string)}>
                      Instalar plantilla
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── GDPR ──────────────────────────────────────────────────────────────────

export function GDPRPanel() {
  const [requests, setRequests] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [contactId, setContactId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setRequests(await api.listDataRequests()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    if (!contactId) return alert('Pega un Contact ID')
    await api.createDataRequest({ type: 'export', contactId })
    setContactId('')
    load()
  }

  const handleDelete = async () => {
    if (!contactId) return alert('Pega un Contact ID')
    if (!confirm('⚠️ Esto eliminará permanentemente al contacto y sus conversaciones. ¿Continuar?')) return
    await api.createDataRequest({ type: 'delete', contactId })
    setContactId('')
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="GDPR y Privacidad" subtitle="Cumplimiento de RGPD: exportación y derecho al olvido" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Solicitar acción sobre datos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Contact ID" value={contactId} onChange={(e) => setContactId(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1" onClick={handleExport}><Download className="w-4 h-4" /> Exportar datos</Button>
              <Button variant="destructive" className="gap-1" onClick={handleDelete}><Trash2 className="w-4 h-4" /> Derecho al olvido</Button>
            </div>
            <p className="text-xs text-slate-500">
              La exportación genera un JSON firmado con todos los datos del contacto (perfil, conversaciones, mensajes, tags, notas).
              El borrado elimina permanentemente al contacto y anonimiza las conversaciones asociadas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de solicitudes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Sin solicitudes</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contact ID</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const rr = obj(r)
                    return (
                      <TableRow key={rr.id as string}>
                        <TableCell><Badge variant={rr.type === 'delete' ? 'destructive' : 'secondary'}>{rr.type as string}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{(rr.contactId as string)?.slice(0, 8) || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{rr.status as string}</Badge></TableCell>
                        <TableCell className="text-xs text-slate-500">{new Date(rr.createdAt as string).toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Billing ───────────────────────────────────────────────────────────────

const PLANS = [
  { id: 'free', name: 'Free', price: 0, conv: 1000, msg: 10000, features: ['1 bot', '1 canal', 'IA básica'] },
  { id: 'pro', name: 'Pro', price: 49, conv: 10000, msg: 100000, features: ['10 bots', 'Multi-canal', 'IA avanzada', 'Analytics'] },
  { id: 'business', name: 'Business', price: 199, conv: 50000, msg: 500000, features: ['Bots ilimitados', 'Integraciones', 'A/B Testing', 'Prioridad'] },
  { id: 'enterprise', name: 'Enterprise', price: -1, conv: -1, msg: -1, features: ['SLA 99.9%', 'SSO/SAML', 'White-label', 'Soporte dedicado'] },
]

export function BillingPanel() {
  const [plans, setPlans] = useState<Array<{
    id: string
    name: string
    description: string
    priceMonthly: number
    conversationsLimit: number
    messagesLimit: number
    seats: number
    features: string[]
    stripePriceId?: string | null
    stripePriceIdAnnual?: string | null
  }>>([])
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<{
    subscription: any
    invoices: any[]
    sunatDocuments: any[]
    customerTaxInfo: any
  } | null>(null)
  const [annual, setAnnual] = useState(false)
  const [customerId] = useState(() => {
    if (typeof window === 'undefined') return 'cust_demo'
    return localStorage.getItem('chatflow_customer_id') || `cust_${Date.now()}`
  })
  const [taxForm, setTaxForm] = useState({
    docType: '6',
    docNumber: '',
    razonSocial: '',
    address: '',
    district: '',
    province: 'LIMA',
    department: 'LIMA',
    ubigeo: '150101',
    email: '',
  })
  const [showTaxForm, setShowTaxForm] = useState(false)
  const [savingTax, setSavingTax] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatflow_customer_id', customerId)
    }
    Promise.all([
      fetch('/api/stripe/plans').then((r) => r.json()),
      fetch('/api/billing/me?customerId=' + encodeURIComponent(customerId), {
        headers: { Authorization: 'Bearer ' + getApiKey() },
      }).then((r) => r.json()),
      api.listUsage().catch(() => ({ aggregated: {} })),
    ])
      .then(([p, b, u]) => {
        setPlans(p.data || [])
        setBillingData(b.data || null)
        setUsage(obj(obj(u).aggregated) as Record<string, number>)
        if (b.data?.customerTaxInfo) {
          const t = b.data.customerTaxInfo
          setTaxForm({
            docType: t.docType,
            docNumber: t.docNumber,
            razonSocial: t.razonSocial,
            address: t.address || '',
            district: t.district || '',
            province: t.province || 'LIMA',
            department: t.department || 'LIMA',
            ubigeo: t.ubigeo || '150101',
            email: t.email || '',
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [customerId])

  const handleCheckout = async (planId: string) => {
    if (planId === 'free' || planId === 'enterprise') return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + getApiKey(),
        },
        body: JSON.stringify({ plan: planId, annual, customerId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error: ' + (data.error || 'No se pudo crear la sesión'))
      }
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + getApiKey(),
        },
        body: JSON.stringify({ customerId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error: ' + (data.error || 'No se pudo abrir el portal'))
      }
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    } finally {
      setPortalLoading(false)
    }
  }

  const handleSaveTax = async () => {
    setSavingTax(true)
    try {
      const res = await fetch('/api/sunat/customer-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + getApiKey(),
        },
        body: JSON.stringify({ customerId, ...taxForm }),
      })
      const data = await res.json()
      if (!data.success) {
        alert('Error: ' + (data.error || 'No se pudo guardar'))
      } else {
        setShowTaxForm(false)
        // reload billing data
        const b = await fetch('/api/billing/me?customerId=' + encodeURIComponent(customerId), {
          headers: { Authorization: 'Bearer ' + getApiKey() },
        }).then((r) => r.json())
        setBillingData(b.data || null)
      }
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    } finally {
      setSavingTax(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  const sub = billingData?.subscription
  const currentPlan = plans.find((p) => p.id === sub?.plan)

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Facturación y Planes"
        subtitle="Gestiona tu suscripción Stripe y comprobantes SUNAT"
        action={
          <div className="flex items-center gap-2">
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> API Docs
            </a>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Usage stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Conversaciones (mes)</div><div className="text-2xl font-bold">{usage.conversations || 0}</div><div className="text-xs text-slate-400">/ {sub?.conversationsLimit || currentPlan?.conversationsLimit || 100}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Mensajes (mes)</div><div className="text-2xl font-bold">{usage.messages || 0}</div><div className="text-xs text-slate-400">/ {sub?.messagesLimit || currentPlan?.messagesLimit || 1000}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Tokens IA (mes)</div><div className="text-2xl font-bold">{usage.ai_tokens || 0}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-slate-500">Plan actual</div><div className="text-2xl font-bold capitalize">{sub?.plan || 'free'}</div><div className="text-xs text-slate-400">{sub?.status || '—'}</div></CardContent></Card>
        </div>

        {/* Billing period toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Planes disponibles</h2>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${!annual ? 'font-semibold' : 'text-slate-500'}`}>Mensual</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${annual ? 'translate-x-6' : ''}`} />
            </button>
            <span className={`text-sm ${annual ? 'font-semibold' : 'text-slate-500'}`}>Anual (-20%)</span>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isCurrent = sub?.plan === p.id
            return (
              <Card key={p.id} className={p.id === 'pro' ? 'border-emerald-500 border-2' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {p.name}
                    {p.id === 'pro' && <Badge className="bg-emerald-500">Recomendado</Badge>}
                  </CardTitle>
                  <div className="text-2xl font-bold">
                    {p.priceMonthly === 0 ? 'Gratis' : `$${(p.priceMonthly / 100).toFixed(0)}/${annual ? 'año' : 'mes'}`}
                  </div>
                  <p className="text-xs text-slate-500">{p.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-slate-600 mb-4">
                    {p.features.map((f, i) => <li key={i} className="flex items-center gap-2"><span className="text-emerald-500">✓</span>{f}</li>)}
                  </ul>
                  <Button
                    className="w-full"
                    variant={p.id === 'pro' ? 'default' : 'outline'}
                    disabled={isCurrent || checkoutLoading || p.id === 'enterprise' || !p.stripePriceId && p.id !== 'free'}
                    onClick={() => handleCheckout(p.id)}
                  >
                    {isCurrent ? 'Plan actual' : p.id === 'enterprise' ? 'Contactar ventas' : p.id === 'free' ? 'Gratis' : checkoutLoading ? 'Procesando…' : 'Suscribir'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Active subscription + Stripe portal */}
        {sub && sub.stripeSubscriptionId && (
          <Card>
            <CardHeader><CardTitle>Suscripción Activa</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-slate-500">Plan:</span> <strong className="capitalize">{sub.plan}</strong></div>
                <div><span className="text-slate-500">Estado:</span> <strong className={sub.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>{sub.status}</strong></div>
                <div><span className="text-slate-500">Periodo:</span> {sub.currentPeriodStart && new Date(sub.currentPeriodStart).toLocaleDateString('es-PE')} → {sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).toLocaleDateString('es-PE')}</div>
                <div><span className="text-slate-500">Asientos:</span> {sub.seats}</div>
                {sub.cancelAtPeriodEnd && <div className="text-amber-600">⚠ Se cancelará al final del periodo</div>}
              </div>
              <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CreditCard className="w-3 h-3 mr-1" />}
                Gestionar suscripción en Stripe
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Customer tax info (SUNAT) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Datos Fiscales (SUNAT)
              <Button variant="outline" size="sm" onClick={() => setShowTaxForm(!showTaxForm)}>
                {showTaxForm ? 'Cancelar' : 'Editar'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingData?.customerTaxInfo ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Tipo Doc:</span> {billingData.customerTaxInfo.docType === '6' ? 'RUC' : billingData.customerTaxInfo.docType === '1' ? 'DNI' : 'Otro'}</div>
                <div><span className="text-slate-500">Número:</span> {billingData.customerTaxInfo.docNumber}</div>
                <div className="col-span-2"><span className="text-slate-500">Razón Social:</span> {billingData.customerTaxInfo.razonSocial}</div>
                <div className="col-span-2"><span className="text-slate-500">Dirección:</span> {billingData.customerTaxInfo.address || '—'}</div>
                <div><span className="text-slate-500">Ubigeo:</span> {billingData.customerTaxInfo.ubigeo || '—'}</div>
                <div><span className="text-slate-500">Email:</span> {billingData.customerTaxInfo.email || '—'}</div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No has registrado tus datos fiscales. Para emitir comprobantes electrónicos (Factura o Boleta) completa tus datos.
              </p>
            )}

            {showTaxForm && (
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Tipo de Documento</label>
                  <Select value={taxForm.docType} onValueChange={(v) => setTaxForm({ ...taxForm, docType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">RUC (11 dígitos) → Factura</SelectItem>
                      <SelectItem value="1">DNI (8 dígitos) → Boleta</SelectItem>
                      <SelectItem value="4">Carnet Extranjería</SelectItem>
                      <SelectItem value="7">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Número de Documento</label>
                  <Input value={taxForm.docNumber} onChange={(e) => setTaxForm({ ...taxForm, docNumber: e.target.value })} placeholder="20512345678" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Razón Social / Nombre</label>
                  <Input value={taxForm.razonSocial} onChange={(e) => setTaxForm({ ...taxForm, razonSocial: e.target.value })} placeholder="Mi Empresa SAC" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Dirección</label>
                  <Input value={taxForm.address} onChange={(e) => setTaxForm({ ...taxForm, address: e.target.value })} placeholder="Av. Javier Prado 1234" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Distrito</label>
                  <Input value={taxForm.district} onChange={(e) => setTaxForm({ ...taxForm, district: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Provincia</label>
                  <Input value={taxForm.province} onChange={(e) => setTaxForm({ ...taxForm, province: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Departamento</label>
                  <Input value={taxForm.department} onChange={(e) => setTaxForm({ ...taxForm, department: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Ubigeo INEI (6 dígitos)</label>
                  <Input value={taxForm.ubigeo} onChange={(e) => setTaxForm({ ...taxForm, ubigeo: e.target.value })} placeholder="150101" maxLength={6} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Email</label>
                  <Input type="email" value={taxForm.email} onChange={(e) => setTaxForm({ ...taxForm, email: e.target.value })} />
                </div>
                <Button onClick={handleSaveTax} disabled={savingTax} className="col-span-2">
                  {savingTax ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Guardar Datos Fiscales
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SUNAT documents */}
        <Card>
          <CardHeader>
            <CardTitle>Comprobantes Electrónicos SUNAT</CardTitle>
          </CardHeader>
          <CardContent>
            {billingData?.sunatDocuments && billingData.sunatDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.sunatDocuments.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{d.serie}-{String(d.correlativo).padStart(8, '0')}</div>
                        <div className="text-xs text-slate-500">{d.tipoDocumento === '01' ? 'Factura' : d.tipoDocumento === '03' ? 'Boleta' : 'Otro'}</div>
                      </TableCell>
                      <TableCell className="text-sm">{d.customerName}</TableCell>
                      <TableCell className="text-sm">{new Date(d.fechaEmision).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell className="text-right font-mono text-sm">S/ {Number(d.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          d.estado === 'aceptado' ? 'border-emerald-500 text-emerald-700' :
                          d.estado === 'enviado' ? 'border-blue-500 text-blue-700' :
                          d.estado === 'rechazado' ? 'border-red-500 text-red-700' :
                          d.estado === 'anulado' ? 'border-slate-500 text-slate-700' :
                          'border-amber-500 text-amber-700'
                        }>
                          {d.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <a href={`/api/sunat/documents/${d.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3" /></Button>
                          </a>
                          <a href={`/api/sunat/documents/${d.id}/xml`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" title="Descargar XML">XML</Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-500">Aún no tienes comprobantes SUNAT. Se generan automáticamente al pagar una factura Stripe.</p>
            )}
          </CardContent>
        </Card>

        {/* Stripe invoices */}
        {billingData?.invoices && billingData.invoices.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Facturas Stripe</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{new Date(inv.createdAt).toLocaleDateString('es-PE')}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{inv.currency.toUpperCase()} {(inv.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={inv.status === 'paid' ? 'border-emerald-500 text-emerald-700' : 'border-amber-500 text-amber-700'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inv.hostedInvoiceUrl && (
                          <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3" /></Button>
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function getApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('chatflow_api_key') || ''
}

// ─── Voice Bots ────────────────────────────────────────────────────────────

export function VoicePanel() {
  const [bots, setBots] = useState<unknown[]>([])
  const [calls, setCalls] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', phoneNumber: '', voice: 'Polly.Lucia-Neural', language: 'es-ES' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, c] = await Promise.all([api.listVoiceBots(), api.listVoiceCalls()])
      setBots(b); setCalls(c)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await api.createVoiceBot(form)
    setShowCreate(false)
    setForm({ name: '', phoneNumber: '', voice: 'Polly.Lucia-Neural', language: 'es-ES' })
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Voice Bots"
        subtitle="Bots de voz con ASR/TTS vía Twilio"
        action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo voice bot</Button>}
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : bots.length === 0 ? (
          <EmptyState
            icon={<Phone className="w-7 h-7" />}
            title="Sin voice bots"
            description="Crea un voice bot para automatizar llamadas telefónicas con IA. Requiere cuenta Twilio configurada."
            action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Crear voice bot</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((b) => {
              const r = obj(b)
              return (
                <Card key={r.id as string}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{r.name as string}</CardTitle>
                        <div className="text-sm text-slate-500">{r.phoneNumber as string || '—'}</div>
                      </div>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Activo' : 'Pausado'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 text-xs text-slate-500">
                      <span>Voz: {r.voice as string}</span>
                      <span>Idioma: {r.language as string}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {calls.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Llamadas recientes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hacia</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 20).map((c) => {
                    const r = obj(c)
                    return (
                      <TableRow key={r.id as string}>
                        <TableCell className="font-mono text-xs">{r.fromNumber as string}</TableCell>
                        <TableCell className="font-mono text-xs">{r.toNumber as string}</TableCell>
                        <TableCell>{r.duration as number}s</TableCell>
                        <TableCell><Badge variant="outline">{r.status as string}</Badge></TableCell>
                        <TableCell className="text-xs text-slate-500">{new Date(r.createdAt as string).toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo voice bot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Número de teléfono (+1234...)" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es-ES">Español (España)</SelectItem>
                <SelectItem value="es-US">Español (Latam)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleCreate}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Workspaces (White Label) ──────────────────────────────────────────────

export function WorkspacesPanel() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', plan: 'free' })

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.listWorkspaces()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    await api.createWorkspace(form)
    setShowCreate(false)
    setForm({ name: '', slug: '', plan: 'free' })
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Workspaces (White Label)"
        subtitle="Múltiples espacios aislados con branding personalizado"
        action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo workspace</Button>}
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-7 h-7" />}
            title="Sin workspaces"
            description="Crea workspaces para aislar datos de diferentes clientes o marcas. Cada workspace puede tener su propio logo, colores y dominio."
            action={<Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Crear workspace</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((w) => {
              const r = obj(w)
              return (
                <Card key={r.id as string}>
                  <CardHeader>
                    <CardTitle className="text-base">{r.name as string}</CardTitle>
                    <Badge variant="secondary">{r.plan as string}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-slate-500 font-mono">{r.slug as string}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo workspace</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Slug (ej: mi-empresa)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleCreate}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Audit Logs ────────────────────────────────────────────────────────────

export function AuditPanel() {
  const [logs, setLogs] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listAuditLogs(200)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Audit Logs" subtitle="Registro de todas las acciones administrativas" />
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText className="w-7 h-7" />} title="Sin eventos" description="Las acciones administrativas aparecerán aquí." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                const r = obj(l)
                return (
                  <TableRow key={r.id as string}>
                    <TableCell className="text-xs text-slate-500">{new Date(r.createdAt as string).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{r.actor as string}</TableCell>
                    <TableCell><Badge variant="outline">{r.action as string}</Badge></TableCell>
                    <TableCell className="text-sm">{r.resource as string}{r.resourceId ? ` (${(r.resourceId as string).slice(0, 8)})` : ''}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">{r.ipAddress as string || '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ─── Users & Roles ─────────────────────────────────────────────────────────

export function UsersPanel() {
  const [users, setUsers] = useState<unknown[]>([])
  const [roles, setRoles] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([api.listUsers(), api.listRoles()])
      setUsers(u); setRoles(r)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar usuario?')) return
    await api.deleteUser(id)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Usuarios y Roles" subtitle="Control de acceso granular con SSO" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>Usuarios</CardTitle></CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Sin usuarios. Configura SSO para invitar miembros.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>SSO</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Último login</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const r = obj(u)
                        return (
                          <TableRow key={r.id as string}>
                            <TableCell className="font-medium">{r.name as string}</TableCell>
                            <TableCell>{r.email as string}</TableCell>
                            <TableCell><Badge variant="secondary">{(r.roleName as string) || '—'}</Badge></TableCell>
                            <TableCell>{r.ssoProvider as string || '—'}</TableCell>
                            <TableCell><Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                            <TableCell className="text-xs text-slate-500">{r.lastLoginAt ? new Date(r.lastLoginAt as string).toLocaleString() : 'Nunca'}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id as string)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Roles disponibles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {roles.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin roles definidos.</p>
                  ) : roles.map((r) => {
                    const rr = obj(r)
                    return <Badge key={rr.id as string} variant="outline" className="text-sm py-1 px-3">{rr.name as string}</Badge>
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Los roles controlan qué permisos tiene cada usuario (read, write, admin, billing, webhooks, etc.).
                  Crea roles personalizados para equipos específicos.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
