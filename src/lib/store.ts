import { create } from 'zustand'
import { api, getApiKey, setApiKey, hasApiKey } from './api-client'

// ─── Types (unchanged from the original API surface) ────────────────────────

export interface FlowNode {
  id: string
  type: 'start' | 'message' | 'buttons' | 'condition' | 'action' | 'transfer' | 'input' | 'ai_response'
    | 'set_variable' | 'http_request' | 'delay' | 'subflow' | 'random' | 'ab_assign' | 'language_switch' | 'csat'
  position: { x: number; y: number }
  data: {
    label: string
    content?: string
    buttons?: { id: string; text: string; nextNodeId?: string }[]
    conditionField?: string
    conditionOperator?: string
    conditionValue?: string
    actionType?: string
    actionValue?: string
    transferTeam?: string
    transferMessage?: string
    variableName?: string
    variableValue?: string
    aiPrompt?: string
    // New fields
    httpRequestUrl?: string
    httpMethod?: string
    httpHeaders?: string
    httpBody?: string
    httpTimeout?: number
    delayMs?: number
    subflowId?: string
    randomBranches?: { id: string; label: string; weight: number }[]
    abTestFlowId?: string
    language?: string
    csatPrompt?: string
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}

export interface Bot {
  id: string
  name: string
  description?: string
  status: string
  channels: string[]
  flows: Flow[]
  createdAt: string
  updatedAt: string
}

export interface Flow {
  id: string
  name: string
  botId: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  trigger: Record<string, unknown>
  isActive: boolean
}

export interface Conversation {
  id: string
  botId: string
  channel: string
  contactName: string
  contactAvatar?: string
  lastMessage?: string
  status: 'active' | 'closed' | 'pending'
  assignedTo?: string
  team?: string
  unread: number
  createdAt: string
  updatedAt: string
  messages: Message[]
  tags: Tag[]
  notes: Note[]
}

export interface Message {
  id: string
  conversationId: string
  sender: 'bot' | 'user' | 'agent'
  content: string
  type: 'text' | 'buttons' | 'image' | 'transfer'
  buttons?: { id: string; text: string }[]
  isBot: boolean
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  conversationId: string
}

export interface Note {
  id: string
  content: string
  author?: string
  createdAt: string
}

export interface Team {
  id: string
  name: string
  description?: string
  members: string[]
  color: string
}

export interface Channel {
  id: string
  type: 'whatsapp' | 'messenger' | 'instagram' | 'telegram'
  name: string
  connected: boolean
  config: Record<string, unknown>
}

type View = 'dashboard' | 'bots' | 'builder' | 'conversations' | 'channels' | 'teams' | 'api' | 'security'
  | 'contacts' | 'broadcasts' | 'analytics' | 'knowledge' | 'integrations'
  | 'ab-testing' | 'marketplace' | 'gdpr' | 'billing' | 'voice' | 'workspaces'
  | 'audit' | 'users' | 'subscriptions' | 'regional'

interface ChatbotStore {
  // Auth
  apiKey: string | null
  apiKeyReady: boolean
  setApiKeyAndPersist: (key: string | null) => void
  // Logged-in user (email/password session)
  currentUser: { id: string; email: string; name: string; roleId: string | null; permissions?: string[] } | null
  setCurrentUser: (u: ChatbotStore['currentUser']) => void
  authMode: 'apikey' | 'session' | null    // which auth method is active
  setAuthMode: (m: 'apikey' | 'session' | null) => void
  logout: () => Promise<void>

  // Loading flags
  loading: {
    bots: boolean
    conversations: boolean
    channels: boolean
    teams: boolean
  }
  error: string | null

  // Navigation
  currentView: View
  setCurrentView: (view: View) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Bots
  bots: Bot[]
  selectedBotId: string | null
  addBot: (bot: Bot) => void
  updateBot: (id: string, data: Partial<Bot>) => void
  deleteBot: (id: string) => void
  selectBot: (id: string) => void
  refreshBots: () => Promise<void>
  createBotViaApi: (data: { name: string; description?: string; channels?: string[] }) => Promise<Bot>
  deleteBotViaApi: (id: string) => Promise<void>

  // Flows
  selectedFlowId: string | null
  flowDirty: Record<string, boolean>        // flowId -> has unsaved changes
  flowSaving: Record<string, boolean>       // flowId -> save in progress
  flowLastSavedAt: Record<string, number>   // flowId -> epoch ms of last successful save
  selectFlow: (id: string) => void
  addFlow: (botId: string, flow: Flow) => void
  updateFlowNodes: (flowId: string, nodes: FlowNode[]) => void
  updateFlowEdges: (flowId: string, edges: FlowEdge[]) => void
  addFlowNode: (flowId: string, node: FlowNode) => void
  updateFlowNode: (flowId: string, nodeId: string, data: Partial<FlowNode['data']>) => void
  deleteFlowNode: (flowId: string, nodeId: string) => void
  markFlowDirty: (flowId: string) => void
  saveFlow: (flowId: string) => Promise<{ ok: boolean; error?: string }>

  // Conversations
  conversations: Conversation[]
  selectedConversationId: string | null
  selectConversation: (id: string) => void
  addConversation: (conv: Conversation) => void
  updateConversation: (id: string, data: Partial<Conversation>) => void
  addMessage: (convId: string, message: Message) => void
  addTag: (convId: string, tag: Tag) => void
  removeTag: (convId: string, tagId: string) => void
  addNote: (convId: string, note: Note) => void
  transferConversation: (convId: string, team: string, agent?: string) => void
  refreshConversations: () => Promise<void>

  // Channels
  channels: Channel[]
  updateChannel: (id: string, data: Partial<Channel>) => void
  refreshChannels: () => Promise<void>

  // Teams
  teams: Team[]
  addTeam: (team: Team) => void
  updateTeam: (id: string, data: Partial<Team>) => void
  deleteTeam: (id: string) => void
  refreshTeams: () => Promise<void>

  // Drag & Drop
  draggedNodeType: FlowNode['type'] | null
  setDraggedNodeType: (type: FlowNode['type'] | null) => void

  // Bootstrap
  runSetup: () => Promise<{ apiKey: string | null; seeded: { teams: number; channels: number; bots: number; flows: number } }>
  refreshAll: () => Promise<void>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeBot(b: unknown): Bot {
  const r = b as Record<string, unknown>
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || undefined,
    status: (r.status as string) || 'draft',
    channels: Array.isArray(r.channels) ? (r.channels as string[]) : [],
    flows: Array.isArray(r.flows) ? (r.flows as unknown[]).map(normalizeFlow) : [],
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
  }
}

function normalizeFlow(f: unknown): Flow {
  const r = f as Record<string, unknown>
  return {
    id: r.id as string,
    name: r.name as string,
    botId: r.botId as string,
    nodes: Array.isArray(r.nodes) ? (r.nodes as FlowNode[]) : [],
    edges: Array.isArray(r.edges) ? (r.edges as FlowEdge[]) : [],
    trigger: (r.trigger as Record<string, unknown>) || {},
    isActive: !!r.isActive,
  }
}

function normalizeConversation(c: unknown): Conversation {
  const r = c as Record<string, unknown>
  return {
    id: r.id as string,
    botId: r.botId as string,
    channel: r.channel as string,
    contactName: (r.contactName as string) || 'Sin nombre',
    contactAvatar: r.contactAvatar as string | undefined,
    lastMessage: (r.lastMessage as string) || undefined,
    status: (r.status as Conversation['status']) || 'active',
    assignedTo: r.assignedTo as string | undefined,
    team: r.team as string | undefined,
    unread: (r.unread as number) || 0,
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
    messages: Array.isArray(r.messages) ? (r.messages as unknown[]).map(m => m as Message) : [],
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(t => t as Tag) : [],
    notes: Array.isArray(r.notes) ? (r.notes as unknown[]).map(n => n as Note) : [],
  }
}

function normalizeChannel(c: unknown): Channel {
  const r = c as Record<string, unknown>
  return {
    id: r.id as string,
    type: r.type as Channel['type'],
    name: r.name as string,
    connected: !!r.connected,
    config: (r.config as Record<string, unknown>) || {},
  }
}

function normalizeTeam(t: unknown): Team {
  const r = t as Record<string, unknown>
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || undefined,
    members: Array.isArray(r.members) ? (r.members as string[]) : [],
    color: (r.color as string) || '#10b981',
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useChatbotStore = create<ChatbotStore>((set, get) => ({
  // Auth
  apiKey: typeof window !== 'undefined' ? getApiKey() : null,
  apiKeyReady: typeof window !== 'undefined' ? hasApiKey() : false,
  setApiKeyAndPersist: (key) => {
    setApiKey(key)
    set({ apiKey: key, apiKeyReady: !!key })
  },
  currentUser: null,
  setCurrentUser: (u) => set({ currentUser: u }),
  authMode: null,
  setAuthMode: (m) => set({ authMode: m }),
  logout: async () => {
    try {
      // If logged in via session cookie, call logout endpoint to clear it
      if (get().authMode === 'session') {
        await api.authLogout()
      }
    } catch { /* ignore — clearing client state anyway */ }
    // Clear client state
    set({
      currentUser: null,
      authMode: null,
      apiKey: null,
      apiKeyReady: false,
      bots: [],
      conversations: [],
      channels: [],
      teams: [],
      selectedBotId: null,
      selectedFlowId: null,
      selectedConversationId: null,
      currentView: 'dashboard',
    })
    // Also remove any persisted API key from localStorage
    setApiKey(null)
  },

  // Loading
  loading: { bots: false, conversations: false, channels: false, teams: false },
  error: null,

  // Navigation
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Bots
  bots: [],
  selectedBotId: null,
  addBot: (bot) => set((s) => ({ bots: [...s.bots, bot] })),
  updateBot: (id, data) => set((s) => ({
    bots: s.bots.map((b) => b.id === id ? { ...b, ...data } : b),
  })),
  deleteBot: (id) => set((s) => ({ bots: s.bots.filter((b) => b.id !== id) })),
  selectBot: (id) => set({ selectedBotId: id }),
  refreshBots: async () => {
    if (!hasApiKey()) return
    set((s) => ({ loading: { ...s.loading, bots: true } }))
    try {
      const data = await api.listBots()
      set({ bots: data.map(normalizeBot) })
    } catch (e) {
      console.error('refreshBots:', e)
      set({ error: e instanceof Error ? e.message : 'Failed to load bots' })
    } finally {
      set((s) => ({ loading: { ...s.loading, bots: false } }))
    }
  },
  createBotViaApi: async (data) => {
    const created = await api.createBot(data) as Record<string, unknown>
    const bot = normalizeBot(created)
    set((s) => ({ bots: [bot, ...s.bots] }))
    return bot
  },
  deleteBotViaApi: async (id) => {
    await api.deleteBot(id)
    set((s) => ({ bots: s.bots.filter((b) => b.id !== id) }))
  },

  // Flows
  selectedFlowId: null,
  flowDirty: {},
  flowSaving: {},
  flowLastSavedAt: {},
  selectFlow: (id) => set({ selectedFlowId: id }),
  addFlow: (botId, flow) => set((s) => ({
    bots: s.bots.map((b) => b.id === botId ? { ...b, flows: [...b.flows, flow] } : b),
  })),
  updateFlowNodes: (flowId, nodes) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, nodes } : f),
    })),
    flowDirty: { ...s.flowDirty, [flowId]: true },
  })),
  updateFlowEdges: (flowId, edges) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, edges } : f),
    })),
    flowDirty: { ...s.flowDirty, [flowId]: true },
  })),
  addFlowNode: (flowId, node) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, nodes: [...f.nodes, node] } : f),
    })),
    flowDirty: { ...s.flowDirty, [flowId]: true },
  })),
  updateFlowNode: (flowId, nodeId, data) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? {
        ...f,
        nodes: f.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
      } : f),
    })),
    flowDirty: { ...s.flowDirty, [flowId]: true },
  })),
  deleteFlowNode: (flowId, nodeId) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? {
        ...f,
        nodes: f.nodes.filter((n) => n.id !== nodeId),
        edges: f.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      } : f),
    })),
    flowDirty: { ...s.flowDirty, [flowId]: true },
  })),
  markFlowDirty: (flowId) => set((s) => ({ flowDirty: { ...s.flowDirty, [flowId]: true } })),
  saveFlow: async (flowId) => {
    const state = get()
    if (state.flowSaving[flowId]) return { ok: false, error: 'save in progress' }
    // Find the flow in any bot
    let flow: Flow | undefined
    for (const b of state.bots) {
      const f = b.flows.find((x) => x.id === flowId)
      if (f) { flow = f; break }
    }
    if (!flow) return { ok: false, error: 'flow not found' }
    set((s) => ({ flowSaving: { ...s.flowSaving, [flowId]: true } }))
    try {
      await api.saveFlow(flowId, {
        name: flow.name,
        nodes: flow.nodes,
        edges: flow.edges,
        trigger: flow.trigger,
        isActive: flow.isActive,
      })
      set((s) => ({
        flowSaving: { ...s.flowSaving, [flowId]: false },
        flowDirty: { ...s.flowDirty, [flowId]: false },
        flowLastSavedAt: { ...s.flowLastSavedAt, [flowId]: Date.now() },
      }))
      return { ok: true }
    } catch (e) {
      set((s) => ({ flowSaving: { ...s.flowSaving, [flowId]: false } }))
      return { ok: false, error: e instanceof Error ? e.message : 'save failed' }
    }
  },

  // Conversations
  conversations: [],
  selectedConversationId: null,
  selectConversation: (id) => set({ selectedConversationId: id }),
  addConversation: (conv) => set((s) => ({ conversations: [conv, ...s.conversations] })),
  updateConversation: (id, data) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
  })),
  addMessage: (convId, message) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === convId ? {
      ...c,
      messages: [...c.messages, message],
      lastMessage: message.content,
      updatedAt: new Date().toISOString(),
    } : c),
  })),
  addTag: (convId, tag) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === convId ? { ...c, tags: [...c.tags, tag] } : c),
  })),
  removeTag: (convId, tagId) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === convId ? { ...c, tags: c.tags.filter((t) => t.id !== tagId) } : c),
  })),
  addNote: (convId, note) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === convId ? { ...c, notes: [...c.notes, note] } : c),
  })),
  transferConversation: (convId, team, agent) => set((s) => ({
    conversations: s.conversations.map((c) => c.id === convId ? { ...c, team, assignedTo: agent, status: 'pending' as const, updatedAt: new Date().toISOString() } : c),
  })),
  refreshConversations: async () => {
    if (!hasApiKey()) return
    set((s) => ({ loading: { ...s.loading, conversations: true } }))
    try {
      const data = await api.listConversations()
      set({ conversations: data.map(normalizeConversation) })
    } catch (e) {
      console.error('refreshConversations:', e)
      set({ error: e instanceof Error ? e.message : 'Failed to load conversations' })
    } finally {
      set((s) => ({ loading: { ...s.loading, conversations: false } }))
    }
  },

  // Channels
  channels: [],
  updateChannel: (id, data) => set((s) => ({
    channels: s.channels.map((c) => c.id === id ? { ...c, ...data } : c),
  })),
  refreshChannels: async () => {
    if (!hasApiKey()) return
    set((s) => ({ loading: { ...s.loading, channels: true } }))
    try {
      const data = await api.listChannels()
      set({ channels: data.map(normalizeChannel) })
    } catch (e) {
      console.error('refreshChannels:', e)
    } finally {
      set((s) => ({ loading: { ...s.loading, channels: false } }))
    }
  },

  // Teams
  teams: [],
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
  updateTeam: (id, data) => set((s) => ({ teams: s.teams.map((t) => t.id === id ? { ...t, ...data } : t) })),
  deleteTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
  refreshTeams: async () => {
    if (!hasApiKey()) return
    set((s) => ({ loading: { ...s.loading, teams: true } }))
    try {
      const data = await api.listTeams()
      set({ teams: data.map(normalizeTeam) })
    } catch (e) {
      console.error('refreshTeams:', e)
    } finally {
      set((s) => ({ loading: { ...s.loading, teams: false } }))
    }
  },

  // Drag & Drop
  draggedNodeType: null,
  setDraggedNodeType: (type) => set({ draggedNodeType: type }),

  // Bootstrap
  runSetup: async () => {
    const result = await api.setup()
    if (result.apiKey) {
      get().setApiKeyAndPersist(result.apiKey)
    }
    await get().refreshAll()
    return {
      apiKey: result.apiKey,
      seeded: result.seeded,
    }
  },
  refreshAll: async () => {
    await Promise.all([
      get().refreshBots(),
      get().refreshConversations(),
      get().refreshChannels(),
      get().refreshTeams(),
    ])
  },
}))
