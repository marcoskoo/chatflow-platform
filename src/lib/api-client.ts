/**
 * Lightweight API client for the ChatFlow frontend.
 *
 * Reads the admin API key from localStorage (set via the Security panel)
 * and attaches it to every request as `x-api-key`.
 *
 * All methods return the parsed JSON body or throw an Error with the
 * server-provided message.
 */

const API_KEY_STORAGE = 'chatflow_api_key'

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(API_KEY_STORAGE)
}

export function setApiKey(key: string | null) {
  if (typeof window === 'undefined') return
  if (key) {
    window.localStorage.setItem(API_KEY_STORAGE, key)
  } else {
    window.localStorage.removeItem(API_KEY_STORAGE)
  }
  // Notify listeners (same-tab) that the key changed
  window.dispatchEvent(new Event('chatflow:apikey-changed'))
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

interface FetchOptions extends RequestInit {
  // When true, do not attach the API key header (e.g. for /api/setup)
  noAuth?: boolean
}

async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (!options.noAuth) {
    const key = getApiKey()
    if (key) headers['x-api-key'] = key
  }

  const res = await fetch(path, { ...options, headers })

  // Try to parse JSON; some endpoints return empty bodies on success
  let data: unknown = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (!res.ok) {
    const msg = (data as { error?: string; message?: string } | null)?.error
      || (data as { message?: string } | null)?.message
      || `Request failed with ${res.status}`
    throw new Error(msg)
  }

  return data as T
}

// ─── Typed API response helpers ─────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean
  data: T
  error?: string
  message?: string
  warning?: string
}

function unwrap<T>(p: Promise<ApiEnvelope<T>>): Promise<T> {
  return p.then(r => {
    if (!r.success) throw new Error(r.error || 'API returned success: false')
    return r.data
  })
}

// ─── Auth (email/password + session cookie) ─────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  roleId: string | null
  roleName?: string | null
  permissions?: string[]
  lastLoginAt?: string | null
  isFirstUser?: boolean
}

// ─── Setup / Bootstrap ──────────────────────────────────────────────────────

export interface SetupResult {
  apiKey: string
  message: string
  seeded: {
    teams: number
    channels: number
    bots: number
    flows: number
  }
}

export const api = {
  /** Run initial setup (idempotent): creates admin key + seed data, returns the raw key. */
  setup: () => apiFetch<ApiEnvelope<SetupResult>>('/api/setup', {
    method: 'POST',
    noAuth: true,
  }).then(r => r.data),

  /** Health check */
  health: () => apiFetch<unknown>('/api/healthz', { noAuth: true }),

  // ─── Auth (email/password + session cookie) ──────────────────────────────
  authLogin: (data: { email: string; password: string }) =>
    unwrap(apiFetch<ApiEnvelope<AuthUser>>('/api/auth/login', {
      method: 'POST',
      noAuth: true,
      body: JSON.stringify(data),
    })),
  authRegister: (data: { email: string; password: string; name: string }) =>
    unwrap(apiFetch<ApiEnvelope<AuthUser & { isFirstUser: boolean }>>('/api/auth/register', {
      method: 'POST',
      noAuth: true,
      body: JSON.stringify(data),
    })),
  authMe: () =>
    unwrap(apiFetch<ApiEnvelope<AuthUser>>('/api/auth/me')),
  authLogout: () =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/auth/logout', { method: 'POST' })),
  authSeedStatus: () =>
    unwrap(apiFetch<ApiEnvelope<{ hasUsers: boolean; userCount: number }>>('/api/auth/seed', { noAuth: true })),
  authSeed: (data?: { email?: string; password?: string; name?: string }) =>
    unwrap(apiFetch<ApiEnvelope<{ created: boolean; data?: AuthUser & { password: string }; message?: string }>>('/api/auth/seed', {
      method: 'POST',
      noAuth: true,
      body: JSON.stringify(data ?? {}),
    })),

  // ─── Bots ────────────────────────────────────────────────────────────────
  listBots: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/bots')),
  createBot: (data: { name: string; description?: string; channels?: string[] }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  updateBot: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/bots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })),
  deleteBot: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/bots/${id}`, { method: 'DELETE' })),

  // ─── Flows ───────────────────────────────────────────────────────────────
  listFlows: (botId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/bots/${botId}/flows`)),
  createFlow: (botId: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/bots/${botId}/flows`, {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  getFlow: (flowId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/flows/${flowId}`)),
  saveFlow: (flowId: string, data: {
    name?: string
    nodes?: unknown[]
    edges?: unknown[]
    trigger?: unknown
    isActive?: boolean
  }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/flows/${flowId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })),

  // ─── Conversations ───────────────────────────────────────────────────────
  listConversations: (params: { channel?: string; status?: string; botId?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.channel) qs.set('channel', params.channel)
    if (params.status) qs.set('status', params.status)
    if (params.botId) qs.set('botId', params.botId)
    const q = qs.toString()
    return unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/conversations${q ? `?${q}` : ''}`))
  },
  getConversation: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${id}`)),
  updateConversation: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })),

  // ─── Messages ────────────────────────────────────────────────────────────
  listMessages: (convId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/conversations/${convId}/messages`)),
  sendMessage: (convId: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })),

  // ─── Tags & Notes ────────────────────────────────────────────────────────
  listTags: (convId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/conversations/${convId}/tags`)),
  addTag: (convId: string, data: { name: string; color?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${convId}/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  listNotes: (convId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/conversations/${convId}/notes`)),
  addNote: (convId: string, data: { content: string; author?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${convId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })),

  // ─── Transfer ────────────────────────────────────────────────────────────
  transfer: (convId: string, data: { team: string; assignedTo?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/conversations/${convId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    })),

  // ─── Channels & Teams ────────────────────────────────────────────────────
  listChannels: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/channels')),
  listTeams: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/teams')),
  createTeam: (data: { name: string; description?: string; members?: string[]; color?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  updateTeam: (id: string, data: { name?: string; description?: string; members?: string[]; color?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })),
  deleteTeam: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/teams/${id}`, { method: 'DELETE' })),

  // ─── API Keys ────────────────────────────────────────────────────────────
  listKeys: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/keys')),
  createKey: (data: { name: string; permissions?: string[] }) =>
    unwrap(apiFetch<ApiEnvelope<unknown> & { warning?: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  updateKey: (id: string, data: { name?: string; permissions?: string[]; isActive?: boolean }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/keys/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })),
  deleteKey: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/keys/${id}`, { method: 'DELETE' })),

  // ─── Webhook Config ──────────────────────────────────────────────────────
  listWebhookConfigs: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/webhook-config')),
  saveWebhookConfig: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/webhook-config', {
      method: 'POST',
      body: JSON.stringify(data),
    })),

  // ─── AI ──────────────────────────────────────────────────────────────────
  aiChat: (data: { message: string; conversationHistory?: unknown[]; botName?: string; channel?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })),
  aiSuggest: (data: { message: string; context?: string }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/ai/suggest', {
      method: 'POST',
      body: JSON.stringify(data),
    })),

  // ─── Contacts (CRM) ─────────────────────────────────────────────────────
  listContacts: (params: { q?: string; tag?: string; channel?: string; language?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.tag) qs.set('tag', params.tag)
    if (params.channel) qs.set('channel', params.channel)
    if (params.language) qs.set('language', params.language)
    const q = qs.toString()
    return unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/contacts${q ? `?${q}` : ''}`))
  },
  getContact: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/contacts/${id}`)),
  createContact: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/contacts', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateContact: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/contacts/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteContact: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/contacts/${id}`, { method: 'DELETE' })),
  importContacts: (contacts: unknown[]) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/contacts/import', {
      method: 'POST', body: JSON.stringify({ contacts }),
    })),
  exportContactsUrl: () => '/api/contacts/export',

  // ─── Broadcasts ──────────────────────────────────────────────────────────
  listBroadcasts: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/broadcasts')),
  createBroadcast: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/broadcasts', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateBroadcast: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/broadcasts/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteBroadcast: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/broadcasts/${id}`, { method: 'DELETE' })),
  sendBroadcast: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/broadcasts/${id}/send`, { method: 'POST' })),

  // ─── Canned Responses ───────────────────────────────────────────────────
  listCannedResponses: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/canned-responses')),
  createCannedResponse: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/canned-responses', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateCannedResponse: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/canned-responses/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteCannedResponse: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/canned-responses/${id}`, { method: 'DELETE' })),

  // ─── Knowledge Base ──────────────────────────────────────────────────────
  listKnowledgeBase: (botId?: string) => {
    const qs = botId ? `?botId=${botId}` : ''
    return unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/knowledge-base${qs}`))
  },
  createKnowledgeBase: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/knowledge-base', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateKnowledgeBase: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/knowledge-base/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteKnowledgeBase: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/knowledge-base/${id}`, { method: 'DELETE' })),

  // ─── Integrations ────────────────────────────────────────────────────────
  listIntegrations: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/integrations')),
  createIntegration: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/integrations', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateIntegration: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/integrations/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteIntegration: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/integrations/${id}`, { method: 'DELETE' })),

  // ─── Outgoing Webhooks ───────────────────────────────────────────────────
  listOutgoingWebhooks: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/outgoing-webhooks')),
  createOutgoingWebhook: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/outgoing-webhooks', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateOutgoingWebhook: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/outgoing-webhooks/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteOutgoingWebhook: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/outgoing-webhooks/${id}`, { method: 'DELETE' })),

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  listAuditLogs: (take = 100) =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/audit-logs?take=${take}`)),
  createAuditLog: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/audit-logs', {
      method: 'POST', body: JSON.stringify(data),
    })),

  // ─── Roles & Users ───────────────────────────────────────────────────────
  listRoles: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/roles')),
  createRole: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/roles', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateRole: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/roles/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteRole: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/roles/${id}`, { method: 'DELETE' })),
  listUsers: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/users')),
  createUser: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/users', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateUser: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/users/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteUser: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/users/${id}`, { method: 'DELETE' })),

  // ─── A/B Testing ─────────────────────────────────────────────────────────
  listABTests: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/ab-tests')),
  createABTest: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/ab-tests', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateABTest: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/ab-tests/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteABTest: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/ab-tests/${id}`, { method: 'DELETE' })),

  // ─── GDPR Data Requests ──────────────────────────────────────────────────
  listDataRequests: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/data-requests')),
  createDataRequest: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/data-requests', {
      method: 'POST', body: JSON.stringify(data),
    })),

  // ─── Marketplace Templates ───────────────────────────────────────────────
  listTemplates: (category?: string) => {
    const qs = category ? `?category=${category}` : ''
    return unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/templates${qs}`))
  },
  createTemplate: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/templates', {
      method: 'POST', body: JSON.stringify(data),
    })),
  deleteTemplate: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/templates/${id}`, { method: 'DELETE' })),
  installTemplate: (id: string, data: { botName: string; channels?: string[] }) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/templates/${id}/install`, {
      method: 'POST', body: JSON.stringify(data),
    })),

  // ─── Regional Settings ───────────────────────────────────────────────────
  getRegionalSettings: () =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/settings/regional')),
  updateRegionalSettings: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/settings/regional', {
      method: 'PUT', body: JSON.stringify(data),
    })),

  // ─── Billing ─────────────────────────────────────────────────────────────
  listSubscriptions: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/subscriptions')),
  createSubscription: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/subscriptions', {
      method: 'POST', body: JSON.stringify(data),
    })),
  listUsage: (params: { from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    const q = qs.toString()
    return unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/usage${q ? `?${q}` : ''}`))
  },
  listInvoices: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/invoices')),

  // ─── Voice Bots ──────────────────────────────────────────────────────────
  listVoiceBots: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/voice-bots')),
  createVoiceBot: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/voice-bots', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateVoiceBot: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/voice-bots/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteVoiceBot: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/voice-bots/${id}`, { method: 'DELETE' })),
  listVoiceCalls: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/voice-calls')),

  // ─── Workspaces ──────────────────────────────────────────────────────────
  listWorkspaces: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/workspaces')),
  createWorkspace: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/workspaces', {
      method: 'POST', body: JSON.stringify(data),
    })),

  // ─── Analytics ───────────────────────────────────────────────────────────
  getAnalytics: (params: { from?: string; to?: string; botId?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.botId) qs.set('botId', params.botId)
    const q = qs.toString()
    return unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/analytics${q ? `?${q}` : ''}`))
  },

  // ─── Admin: Editable Plans ───────────────────────────────────────────────
  // Returns the full plan catalog including DB overrides. Use this in the
  // admin Subscription panel; for the public list use /api/stripe/plans.
  listAdminPlans: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/admin/plans')),
  saveAdminPlan: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/admin/plans', {
      method: 'POST', body: JSON.stringify(data),
    })),
  deleteAdminPlan: (planId: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/admin/plans/${encodeURIComponent(planId)}`, {
      method: 'DELETE',
    })),

  // ─── Admin: Payment Methods (bank_transfer, yape, plin, stripe) ──────────
  listPaymentMethods: () =>
    unwrap(apiFetch<ApiEnvelope<unknown[]>>('/api/admin/payment-methods')),
  createPaymentMethod: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/admin/payment-methods', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updatePaymentMethod: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/admin/payment-methods/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deletePaymentMethod: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/admin/payment-methods/${id}`, {
      method: 'DELETE',
    })),

  // ─── Admin: Manual Payments (verify Yape/Plin/Transfers) ─────────────────
  listManualPayments: (params: { status?: string; take?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.take) qs.set('take', String(params.take))
    const q = qs.toString()
    return unwrap(apiFetch<ApiEnvelope<unknown[]>>(`/api/admin/manual-payments${q ? `?${q}` : ''}`))
  },
  createManualPayment: (data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>('/api/admin/manual-payments', {
      method: 'POST', body: JSON.stringify(data),
    })),
  updateManualPayment: (id: string, data: Record<string, unknown>) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/admin/manual-payments/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    })),
  deleteManualPayment: (id: string) =>
    unwrap(apiFetch<ApiEnvelope<unknown>>(`/api/admin/manual-payments/${id}`, {
      method: 'DELETE',
    })),
}
