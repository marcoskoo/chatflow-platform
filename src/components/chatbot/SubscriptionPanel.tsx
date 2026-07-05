'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useCallback } from 'react'
import { api, getApiKey } from '@/lib/api-client'
import {
  Button, Input, Textarea, Badge, Card, CardHeader, CardTitle, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Switch, Label, Separator,
} from '@/components/chatbot/ui'
import {
  RefreshCw, Plus, Trash2, Edit2, Save, X, Loader2, CreditCard,
  Building2, Smartphone, CheckCircle2, XCircle, AlertCircle,
  DollarSign, Wallet, Receipt, Settings2, Star, Eye, EyeOff,
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

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {}

function fmtMoney(cents: number, currency = 'PEN'): string {
  const value = (cents || 0) / 100
  const sym = currency === 'PEN' ? 'S/' : currency === 'USD' ? '$' : ''
  return `${sym} ${value.toFixed(2)}`
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminPlan {
  id: string
  planId: string
  name: string
  description: string
  priceMonthly: number
  priceAnnual: number
  currency: string
  conversationsLimit: number
  messagesLimit: number
  seats: number
  features: string[]
  stripePriceId: string
  stripePriceIdAnnual: string
  isActive: boolean
  sortOrder: number
  isFeatured: boolean
  ctaLabel: string
  isOverride: boolean
}

type PaymentType = 'bank_transfer' | 'yape' | 'plin' | 'stripe'

interface PaymentMethod {
  id: string
  type: PaymentType
  label: string
  currency: string
  isActive: boolean
  config: Record<string, unknown>
  qrImageUrl: string
  instructions: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ManualPayment {
  id: string
  method: string
  amount: number
  currency: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  operationNumber: string | null
  proofUrl: string | null
  status: string
  notes: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  createdAt: string
}

// ─── Main Component ────────────────────────────────────────────────────────

export function SubscriptionPanel() {
  const [tab, setTab] = useState<'plans' | 'payments' | 'manual'>('plans')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 50)
    return () => clearTimeout(t)
  }, [refreshKey, tab])

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Suscripciones y Cobros"
        subtitle="Edita planes, configura cuentas para depósito/transferencia, Yape, Plin y tarjetas"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={refresh}>
              <RefreshCw className="w-4 h-4" /> Refrescar
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-slate-200 bg-white">
        <TabButton active={tab === 'plans'} onClick={() => setTab('plans')} icon={<DollarSign className="w-4 h-4" />}>
          Planes y Precios
        </TabButton>
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')} icon={<Wallet className="w-4 h-4" />}>
          Métodos de Pago
        </TabButton>
        <TabButton active={tab === 'manual'} onClick={() => setTab('manual')} icon={<Receipt className="w-4 h-4" />}>
          Pagos por Verificar
        </TabButton>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : tab === 'plans' ? (
          <PlansTab key={`plans-${refreshKey}`} />
        ) : tab === 'payments' ? (
          <PaymentsTab key={`payments-${refreshKey}`} />
        ) : (
          <ManualPaymentsTab key={`manual-${refreshKey}`} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Tab 1: Plans ───────────────────────────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminPlan | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listAdminPlans()
      setPlans(data as AdminPlan[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleEdit = (p: AdminPlan) => {
    setEditing(p)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditing({
      id: '',
      planId: '',
      name: '',
      description: '',
      priceMonthly: 0,
      priceAnnual: 0,
      currency: 'PEN',
      conversationsLimit: 1000,
      messagesLimit: 10000,
      seats: 1,
      features: [],
      stripePriceId: '',
      stripePriceIdAnnual: '',
      isActive: true,
      sortOrder: plans.length,
      isFeatured: false,
      ctaLabel: 'Suscribir',
      isOverride: false,
    })
    setShowForm(true)
  }

  const handleDelete = async (planId: string) => {
    if (!confirm(`¿Eliminar el plan "${planId}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteAdminPlan(planId)
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Planes disponibles</h2>
          <p className="text-sm text-slate-500">
            Edita precios, límites, características y Stripe Price IDs. Los cambios se reflejan
            inmediatamente en la página de Facturación.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={handleNew}>
          <Plus className="w-4 h-4" /> Nuevo Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <Card
            key={p.planId}
            className={p.isFeatured ? 'border-emerald-500 border-2' : ''}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {p.name}
                  {p.isFeatured && <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />}
                </CardTitle>
                <Badge variant={p.isActive ? 'default' : 'secondary'}>
                  {p.isActive ? 'Activo' : 'Pausado'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {p.priceMonthly === 0 ? 'Gratis' : fmtMoney(p.priceMonthly, p.currency)}
                <span className="text-xs text-slate-500 font-normal">/mes</span>
              </div>
              {p.priceAnnual > 0 && (
                <div className="text-xs text-emerald-600">
                  Anual: {fmtMoney(p.priceAnnual, p.currency)} (-20%)
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">{p.description}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Conversaciones:</span>
                  <span className="font-mono">{p.conversationsLimit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mensajes:</span>
                  <span className="font-mono">{p.messagesLimit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Asientos:</span>
                  <span className="font-mono">{p.seats}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Características</p>
                <ul className="space-y-0.5 text-xs text-slate-600">
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                  {p.features.length > 3 && (
                    <li className="text-[10px] text-slate-400">+{p.features.length - 3} más</li>
                  )}
                </ul>
              </div>
              {(p.stripePriceId || p.stripePriceIdAnnual) && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Stripe: {p.stripePriceId || '—'} / {p.stripePriceIdAnnual || '—'}
                </div>
              )}
              <div className="flex gap-1 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleEdit(p)}>
                  <Edit2 className="w-3 h-3" /> Editar
                </Button>
                {p.isOverride && !['free', 'pro', 'business', 'enterprise'].includes(p.planId) && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.planId)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && editing && (
        <PlanEditDialog
          plan={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Plan Edit Dialog ───────────────────────────────────────────────────────

function PlanEditDialog({
  plan, onClose, onSaved,
}: {
  plan: AdminPlan
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    planId: plan.planId,
    name: plan.name,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    priceAnnual: plan.priceAnnual,
    currency: plan.currency,
    conversationsLimit: plan.conversationsLimit,
    messagesLimit: plan.messagesLimit,
    seats: plan.seats,
    features: plan.features.join('\n'),
    stripePriceId: plan.stripePriceId,
    stripePriceIdAnnual: plan.stripePriceIdAnnual,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    isFeatured: plan.isFeatured,
    ctaLabel: plan.ctaLabel,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.planId.trim()) {
      alert('El ID del plan es obligatorio')
      return
    }
    setSaving(true)
    try {
      await api.saveAdminPlan({
        planId: form.planId.trim(),
        name: form.name.trim(),
        description: form.description,
        priceMonthly: Number(form.priceMonthly) || 0,
        priceAnnual: Number(form.priceAnnual) || 0,
        currency: form.currency,
        conversationsLimit: Number(form.conversationsLimit) || 0,
        messagesLimit: Number(form.messagesLimit) || 0,
        seats: Number(form.seats) || 1,
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
        stripePriceId: form.stripePriceId || undefined,
        stripePriceIdAnnual: form.stripePriceIdAnnual || undefined,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        isFeatured: form.isFeatured,
        ctaLabel: form.ctaLabel,
      })
      onSaved()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan.isOverride ? 'Editar Plan' : 'Configurar Plan'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">ID del Plan (único)</Label>
              <Input
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
                placeholder="pro, business, starter..."
                disabled={plan.isOverride}
              />
              <p className="text-[10px] text-slate-500 mt-1">No editable después de crear</p>
            </div>
            <div>
              <Label className="text-xs">Nombre visible</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pro, Business..."
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Descripción corta</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Para equipos pequeños en crecimiento"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Precio mensual (centavos)</Label>
              <Input
                type="number"
                value={form.priceMonthly}
                onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })}
                placeholder="4900"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {fmtMoney(form.priceMonthly, form.currency)} / mes
              </p>
            </div>
            <div>
              <Label className="text-xs">Precio anual (centavos)</Label>
              <Input
                type="number"
                value={form.priceAnnual}
                onChange={(e) => setForm({ ...form, priceAnnual: Number(e.target.value) })}
                placeholder="470400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {form.priceAnnual > 0 ? fmtMoney(form.priceAnnual, form.currency) + ' / año' : '—'}
              </p>
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN (S/)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Límite conversaciones/mes</Label>
              <Input
                type="number"
                value={form.conversationsLimit}
                onChange={(e) => setForm({ ...form, conversationsLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Límite mensajes/mes</Label>
              <Input
                type="number"
                value={form.messagesLimit}
                onChange={(e) => setForm({ ...form, messagesLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Asientos (usuarios)</Label>
              <Input
                type="number"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Características (una por línea)</Label>
            <Textarea
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder={'5 bots\nTodos los canales\nSoporte prioritario'}
              rows={5}
            />
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Stripe Price ID mensual (opcional)</Label>
            <Input
              value={form.stripePriceId}
              onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
              placeholder="price_1Q..."
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Crea este precio en Stripe Dashboard → Products → Add price (recurring, monthly)
            </p>
          </div>

          <div>
            <Label className="text-xs">Stripe Price ID anual (opcional)</Label>
            <Input
              value={form.stripePriceIdAnnual}
              onChange={(e) => setForm({ ...form, stripePriceIdAnnual: e.target.value })}
              placeholder="price_1Q..."
              className="font-mono text-xs"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Orden</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Texto del botón</Label>
              <Input
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="Suscribir"
              />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                Activo
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
                />
                Destacado
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab 2: Payment Methods ─────────────────────────────────────────────────

function PaymentsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newType, setNewType] = useState<PaymentType | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listPaymentMethods()
      setMethods(data as PaymentMethod[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleNew = (type: PaymentType) => {
    setNewType(type)
    setEditing({
      id: '',
      type,
      label: defaultLabel(type),
      currency: 'PEN',
      isActive: true,
      config: {},
      qrImageUrl: '',
      instructions: null,
      sortOrder: methods.length,
      createdAt: '',
      updatedAt: '',
    })
    setShowForm(true)
  }

  const handleEdit = (m: PaymentMethod) => {
    setNewType(null)
    setEditing(m)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return
    try {
      await api.deletePaymentMethod(id)
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  const handleToggleActive = async (m: PaymentMethod) => {
    try {
      await api.updatePaymentMethod(m.id, { isActive: !m.isActive })
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
  }

  const bankTransfers = methods.filter((m) => m.type === 'bank_transfer')
  const yapeMethods = methods.filter((m) => m.type === 'yape')
  const plinMethods = methods.filter((m) => m.type === 'plin')
  const stripeMethods = methods.filter((m) => m.type === 'stripe')

  return (
    <div className="p-6 space-y-6">
      {/* Quick add buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar método de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" className="gap-2 justify-start" onClick={() => handleNew('bank_transfer')}>
              <Building2 className="w-4 h-4 text-blue-600" /> Cuenta bancaria
            </Button>
            <Button variant="outline" className="gap-2 justify-start" onClick={() => handleNew('yape')}>
              <Smartphone className="w-4 h-4 text-purple-600" /> Yape
            </Button>
            <Button variant="outline" className="gap-2 justify-start" onClick={() => handleNew('plin')}>
              <Smartphone className="w-4 h-4 text-cyan-600" /> Plin
            </Button>
            <Button variant="outline" className="gap-2 justify-start" onClick={() => handleNew('stripe')}>
              <CreditCard className="w-4 h-4 text-indigo-600" /> Tarjeta (Stripe)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank transfers */}
      <PaymentSection
        title="Transferencias / Depósitos Bancarios"
        icon={<Building2 className="w-5 h-5 text-blue-600" />}
        items={bankTransfers}
        onAdd={() => handleNew('bank_transfer')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
        renderDetails={(m) => {
          const c = m.config
          return (
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-500">Banco:</span> {String(c.bank || '—')}</div>
              <div><span className="text-slate-500">Cuenta:</span> <span className="font-mono">{String(c.accountNumber || '—')}</span></div>
              {Boolean(c.cci) && <div><span className="text-slate-500">CCI:</span> <span className="font-mono">{String(c.cci)}</span></div>}
              <div><span className="text-slate-500">Titular:</span> {String(c.holderName || '—')}</div>
              {Boolean(c.holderDocNumber) && <div><span className="text-slate-500">Doc:</span> <span className="font-mono">{String(c.holderDocType || '')} {String(c.holderDocNumber)}</span></div>}
            </div>
          )
        }}
      />

      {/* Yape */}
      <PaymentSection
        title="Yape"
        icon={<Smartphone className="w-5 h-5 text-purple-600" />}
        items={yapeMethods}
        onAdd={() => handleNew('yape')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
        renderDetails={(m) => {
          const c = m.config
          return (
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-500">Teléfono:</span> <span className="font-mono">{String(c.phone || '—')}</span></div>
              <div><span className="text-slate-500">Titular:</span> {String(c.holderName || '—')}</div>
              {Boolean(c.holderDocNumber) && <div><span className="text-slate-500">Doc:</span> <span className="font-mono">{String(c.holderDocType || '')} {String(c.holderDocNumber)}</span></div>}
              {m.qrImageUrl && (
                <div className="pt-1">
                  <img src={m.qrImageUrl} alt="QR Yape" className="w-24 h-24 rounded border border-slate-200" />
                </div>
              )}
            </div>
          )
        }}
      />

      {/* Plin */}
      <PaymentSection
        title="Plin"
        icon={<Smartphone className="w-5 h-5 text-cyan-600" />}
        items={plinMethods}
        onAdd={() => handleNew('plin')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
        renderDetails={(m) => {
          const c = m.config
          return (
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-500">Teléfono:</span> <span className="font-mono">{String(c.phone || '—')}</span></div>
              <div><span className="text-slate-500">Titular:</span> {String(c.holderName || '—')}</div>
              {Boolean(c.holderDocNumber) && <div><span className="text-slate-500">Doc:</span> <span className="font-mono">{String(c.holderDocType || '')} {String(c.holderDocNumber)}</span></div>}
              {m.qrImageUrl && (
                <div className="pt-1">
                  <img src={m.qrImageUrl} alt="QR Plin" className="w-24 h-24 rounded border border-slate-200" />
                </div>
              )}
            </div>
          )
        }}
      />

      {/* Stripe */}
      <PaymentSection
        title="Tarjetas de Crédito/Débito (Stripe)"
        icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
        items={stripeMethods}
        onAdd={() => handleNew('stripe')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggleActive}
        renderDetails={(m) => {
          const c = m.config
          return (
            <div className="space-y-1 text-xs">
              <div><span className="text-slate-500">Modo:</span> <Badge variant="outline">{String(c.mode || 'test')}</Badge></div>
              {Boolean(c.publishableKey) && (
                <div><span className="text-slate-500">Publishable key:</span> <span className="font-mono text-[10px]">{String(c.publishableKey).slice(0, 20)}…</span></div>
              )}
              <div className="pt-1 text-[10px] text-slate-500">
                El monto se cobra automáticamente vía Stripe Checkout. Configura STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET en .env
              </div>
            </div>
          )
        }}
      />

      {showForm && editing && (
        <PaymentMethodEditDialog
          method={editing}
          isNew={!!newType}
          onClose={() => { setShowForm(false); setEditing(null); setNewType(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); setNewType(null); load() }}
        />
      )}
    </div>
  )
}

function PaymentSection({
  title, icon, items, onAdd, onEdit, onDelete, onToggle, renderDetails,
}: {
  title: string
  icon: React.ReactNode
  items: PaymentMethod[]
  onAdd: () => void
  onEdit: (m: PaymentMethod) => void
  onDelete: (id: string) => void
  onToggle: (m: PaymentMethod) => void
  renderDetails: (m: PaymentMethod) => React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={onAdd}>
            <Plus className="w-3 h-3" /> Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No hay métodos configurados. Haz clic en "Agregar" para crear uno.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((m) => (
              <div key={m.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{m.label}</div>
                  <Badge variant={m.isActive ? 'default' : 'secondary'}>
                    {m.isActive ? 'Activo' : 'Pausado'}
                  </Badge>
                </div>
                {renderDetails(m)}
                {m.instructions && (
                  <div className="text-[10px] text-slate-500 italic line-clamp-2">{m.instructions}</div>
                )}
                <div className="flex gap-1 pt-2 border-t border-slate-100">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => onEdit(m)}>
                    <Edit2 className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onToggle(m)}>
                    {m.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(m.id)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Payment Method Edit Dialog ─────────────────────────────────────────────

function PaymentMethodEditDialog({
  method, isNew, onClose, onSaved,
}: {
  method: PaymentMethod
  isNew: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    label: method.label,
    currency: method.currency,
    isActive: method.isActive,
    instructions: method.instructions || '',
    sortOrder: method.sortOrder,
    qrImageUrl: method.qrImageUrl,
    // bank_transfer
    bank: String(method.config.bank || ''),
    accountNumber: String(method.config.accountNumber || ''),
    cci: String(method.config.cci || ''),
    holderName: String(method.config.holderName || ''),
    holderDocType: String(method.config.holderDocType || '6'),
    holderDocNumber: String(method.config.holderDocNumber || ''),
    email: String(method.config.email || ''),
    // yape / plin
    phone: String(method.config.phone || ''),
    // stripe
    publishableKey: String(method.config.publishableKey || ''),
    mode: String(method.config.mode || 'test'),
  })
  const [saving, setSaving] = useState(false)

  const buildConfig = (): Record<string, unknown> => {
    if (method.type === 'bank_transfer') {
      return {
        bank: form.bank,
        accountNumber: form.accountNumber,
        cci: form.cci,
        holderName: form.holderName,
        holderDocType: form.holderDocType,
        holderDocNumber: form.holderDocNumber,
        email: form.email,
      }
    }
    if (method.type === 'yape' || method.type === 'plin') {
      return {
        phone: form.phone,
        holderName: form.holderName,
        holderDocType: form.holderDocType,
        holderDocNumber: form.holderDocNumber,
      }
    }
    if (method.type === 'stripe') {
      return {
        publishableKey: form.publishableKey,
        mode: form.mode,
      }
    }
    return {}
  }

  const handleSave = async () => {
    if (!form.label.trim()) {
      alert('El nombre visible es obligatorio')
      return
    }
    setSaving(true)
    try {
      const payload = {
        type: method.type,
        label: form.label.trim(),
        currency: form.currency,
        isActive: form.isActive,
        instructions: form.instructions || undefined,
        sortOrder: form.sortOrder,
        qrImageUrl: form.qrImageUrl || undefined,
        config: buildConfig(),
      }
      if (isNew) {
        await api.createPaymentMethod(payload)
      } else {
        await api.updatePaymentMethod(method.id, payload)
      }
      onSaved()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Nuevo ' : 'Editar '}
            {method.type === 'bank_transfer' && 'Cuenta Bancaria'}
            {method.type === 'yape' && 'Yape'}
            {method.type === 'plin' && 'Plin'}
            {method.type === 'stripe' && 'Tarjeta (Stripe)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nombre visible</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="BCP Soles, Yape MiNegocio..."
              />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN (Soles)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific fields */}
          {method.type === 'bank_transfer' && (
            <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <h4 className="text-xs font-semibold text-slate-700">Datos de la cuenta</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Banco</Label>
                  <Select value={form.bank} onValueChange={(v) => setForm({ ...form, bank: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona el banco" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BCP">BCP</SelectItem>
                      <SelectItem value="Interbank">Interbank</SelectItem>
                      <SelectItem value="BBVA">BBVA</SelectItem>
                      <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                      <SelectItem value="Banbif">Banbif</SelectItem>
                      <SelectItem value="Pichincha">Banco Pichincha</SelectItem>
                      <SelectItem value="Continental">BBVA Continental</SelectItem>
                      <SelectItem value="Nacion">Banco de la Nación</SelectItem>
                      <SelectItem value="Citibank">Citibank</SelectItem>
                      <SelectItem value="Mibanco">Mibanco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de cuenta</Label>
                  <Select value={String(method.config.accountType || 'corriente')} onValueChange={(v) => setForm({ ...form, bank: form.bank })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahorro">Cuenta de Ahorros</SelectItem>
                      <SelectItem value="corriente">Cuenta Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Número de cuenta</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    placeholder="194-1234567-0-01"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">CCI (código interbancario)</Label>
                  <Input
                    value={form.cci}
                    onChange={(e) => setForm({ ...form, cci: e.target.value })}
                    placeholder="002194001234567001"
                    maxLength={20}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Titular de la cuenta</Label>
                  <Input
                    value={form.holderName}
                    onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                    placeholder="Mi Empresa SAC"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo Doc.</Label>
                  <Select value={form.holderDocType} onValueChange={(v) => setForm({ ...form, holderDocType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">RUC</SelectItem>
                      <SelectItem value="1">DNI</SelectItem>
                      <SelectItem value="4">Carnet Ext.</SelectItem>
                      <SelectItem value="7">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">N° Documento</Label>
                  <Input
                    value={form.holderDocNumber}
                    onChange={(e) => setForm({ ...form, holderDocNumber: e.target.value })}
                    placeholder="20512345678"
                    className="font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Email para confirmaciones (opcional)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="pagos@miempresa.pe"
                  />
                </div>
              </div>
            </div>
          )}

          {(method.type === 'yape' || method.type === 'plin') && (
            <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <h4 className="text-xs font-semibold text-slate-700">
                Datos {method.type === 'yape' ? 'Yape' : 'Plin'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Número de teléfono</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="999 888 777"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Titular</Label>
                  <Input
                    value={form.holderName}
                    onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                    placeholder="Mi Empresa SAC"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo Doc.</Label>
                  <Select value={form.holderDocType} onValueChange={(v) => setForm({ ...form, holderDocType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">RUC</SelectItem>
                      <SelectItem value="1">DNI</SelectItem>
                      <SelectItem value="4">Carnet Ext.</SelectItem>
                      <SelectItem value="7">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">N° Documento</Label>
                  <Input
                    value={form.holderDocNumber}
                    onChange={(e) => setForm({ ...form, holderDocNumber: e.target.value })}
                    placeholder="20512345678"
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">URL del código QR (opcional)</Label>
                <Input
                  value={form.qrImageUrl}
                  onChange={(e) => setForm({ ...form, qrImageUrl: e.target.value })}
                  placeholder="https://.../yape-qr.png"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Sube la imagen del QR a un servidor (o S3) y pega aquí la URL. El cliente verá el QR al pagar.
                </p>
              </div>
            </div>
          )}

          {method.type === 'stripe' && (
            <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <h4 className="text-xs font-semibold text-slate-700">Configuración Stripe</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Modo</Label>
                  <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test (sandbox)</SelectItem>
                      <SelectItem value="live">Live (producción)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Publishable key (opcional, informativo)</Label>
                  <Input
                    value={form.publishableKey}
                    onChange={(e) => setForm({ ...form, publishableKey: e.target.value })}
                    placeholder="pk_test_... / pk_live_..."
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-800">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                El cobro real con tarjeta requiere configurar las variables de entorno:
                <code className="block mt-1 font-mono text-[10px]">STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET</code>
                No compartas la secret key aquí. Configúrala en el archivo .env del servidor.
              </div>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-xs">Instrucciones para el cliente (opcional)</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={'Deposita o transfiere el monto exacto a la cuenta indicada.'}
              rows={3}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Se muestran al cliente después de seleccionar este método de pago.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Orden</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                Activo (visible para clientes)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab 3: Manual Payments (Yape/Plin/Transfer verification) ──────────────

function ManualPaymentsTab() {
  const [payments, setPayments] = useState<ManualPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listManualPayments({
        status: filter === 'all' ? undefined : filter,
        take: 200,
      })
      setPayments(data as ManualPayment[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleVerify = async (id: string) => {
    try {
      await api.updateManualPayment(id, { status: 'verified' })
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  const handleReject = async (id: string) => {
    const notes = prompt('Motivo del rechazo (opcional):') || ''
    try {
      await api.updateManualPayment(id, { status: 'rejected', notes })
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de pago?')) return
    try {
      await api.deleteManualPayment(id)
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  const handleCreate = async () => {
    const method = prompt('Método (bank_transfer / yape / plin):')
    if (!method) return
    const amountStr = prompt('Monto en centavos (ej. 4900 = S/ 49.00):')
    if (!amountStr) return
    const amount = Number(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Monto inválido')
      return
    }
    const customerName = prompt('Nombre del cliente (opcional):') || ''
    const operationNumber = prompt('N° de operación (opcional):') || ''
    try {
      await api.createManualPayment({
        method,
        amount,
        currency: 'PEN',
        customerName: customerName || undefined,
        operationNumber: operationNumber || undefined,
      })
      load()
    } catch (e) {
      alert('Error: ' + (e as Error).message)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pagos manuales por verificar</CardTitle>
            <div className="flex gap-2">
              {(['pending', 'verified', 'rejected', 'all'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                >
                  {f === 'pending' && 'Pendientes'}
                  {f === 'verified' && 'Verificados'}
                  {f === 'rejected' && 'Rechazados'}
                  {f === 'all' && 'Todos'}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="gap-1" onClick={handleCreate}>
                <Plus className="w-3 h-3" /> Registrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay pagos en este estado.</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando un cliente reporta un pago por Yape/Plin/Transferencia, aparecerá aquí para verificación.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>N° Operación</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString('es-PE')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        p.method === 'yape' ? 'border-purple-500 text-purple-700' :
                        p.method === 'plin' ? 'border-cyan-500 text-cyan-700' :
                        p.method === 'bank_transfer' ? 'border-blue-500 text-blue-700' :
                        'border-slate-400'
                      }>
                        {p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{p.customerName || '—'}</div>
                      {p.customerEmail && <div className="text-xs text-slate-500">{p.customerEmail}</div>}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{p.operationNumber || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmtMoney(p.amount, p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        p.status === 'verified' ? 'border-emerald-500 text-emerald-700' :
                        p.status === 'rejected' ? 'border-red-500 text-red-700' :
                        p.status === 'refunded' ? 'border-amber-500 text-amber-700' :
                        'border-slate-400 text-slate-600'
                      }>
                        {p.status}
                      </Badge>
                      {p.verifiedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5">por {p.verifiedBy}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleVerify(p.id)} title="Verificar">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleReject(p.id)} title="Rechazar">
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Eliminar">
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <AlertCircle className="w-3 h-3" /> Flujo de pagos manuales
          </div>
          <p>1. El cliente elige Yape/Plin/Transferencia al suscribirse.</p>
          <p>2. Realiza el pago y reporta el N° de operación (vía webhook o form externo).</p>
          <p>3. El pago aparece aquí como <Badge variant="outline">pendiente</Badge>.</p>
          <p>4. Verificas el dinero en tu cuenta/app y haces clic en ✓ para confirmar.</p>
          <p>5. La suscripción del cliente se activa automáticamente al verificar.</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultLabel(type: PaymentType): string {
  switch (type) {
    case 'bank_transfer':
      return 'Transferencia / Depósito Bancario'
    case 'yape':
      return 'Yape'
    case 'plin':
      return 'Plin'
    case 'stripe':
      return 'Tarjeta Crédito/Débito (Stripe)'
    default:
      return type
  }
}

// Suppress unused import warning for getApiKey (kept for future customer-facing form)
void getApiKey
