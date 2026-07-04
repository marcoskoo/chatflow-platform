import { create } from 'zustand'

export interface FlowNode {
  id: string
  type: 'start' | 'message' | 'buttons' | 'condition' | 'action' | 'transfer' | 'input' | 'ai_response'
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
    aiPrompt?: string
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

interface ChatbotStore {
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
  
  // Flows
  selectedFlowId: string | null
  selectFlow: (id: string) => void
  addFlow: (botId: string, flow: Flow) => void
  updateFlowNodes: (flowId: string, nodes: FlowNode[]) => void
  updateFlowEdges: (flowId: string, edges: FlowEdge[]) => void
  addFlowNode: (flowId: string, node: FlowNode) => void
  updateFlowNode: (flowId: string, nodeId: string, data: Partial<FlowNode['data']>) => void
  deleteFlowNode: (flowId: string, nodeId: string) => void
  
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
  
  // Channels
  channels: Channel[]
  updateChannel: (id: string, data: Partial<Channel>) => void
  
  // Teams
  teams: Team[]
  addTeam: (team: Team) => void
  updateTeam: (id: string, data: Partial<Team>) => void
  deleteTeam: (id: string) => void
  
  // Drag & Drop
  draggedNodeType: FlowNode['type'] | null
  setDraggedNodeType: (type: FlowNode['type'] | null) => void
}

const defaultTeams: Team[] = [
  { id: 'team-1', name: 'Soporte General', description: 'Equipo de soporte al cliente', members: ['Ana García', 'Carlos López'], color: '#10b981' },
  { id: 'team-2', name: 'Ventas', description: 'Equipo comercial y ventas', members: ['María Rodríguez', 'Pedro Sánchez'], color: '#f59e0b' },
  { id: 'team-3', name: 'Soporte Técnico', description: 'Equipo de soporte técnico avanzado', members: ['Luis Martínez', 'Sofia Hernández'], color: '#8b5cf6' },
]

const defaultChannels: Channel[] = [
  { id: 'ch-1', type: 'whatsapp', name: 'WhatsApp Business', connected: true, config: {} },
  { id: 'ch-2', type: 'messenger', name: 'Facebook Messenger', connected: true, config: {} },
  { id: 'ch-3', type: 'instagram', name: 'Instagram Direct', connected: false, config: {} },
  { id: 'ch-4', type: 'telegram', name: 'Telegram Bot', connected: true, config: {} },
]

const defaultConversations: Conversation[] = [
  {
    id: 'conv-1', botId: 'bot-1', channel: 'whatsapp', contactName: 'Juan Pérez',
    lastMessage: 'Necesito ayuda con mi pedido', status: 'active', assignedTo: undefined,
    team: undefined, unread: 3, createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { id: 'm1', conversationId: 'conv-1', sender: 'user', content: 'Hola, buenos días', type: 'text', isBot: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm2', conversationId: 'conv-1', sender: 'bot', content: '¡Hola Juan! 👋 Bienvenido a nuestro servicio de atención. ¿En qué puedo ayudarte hoy?', type: 'buttons', buttons: [{ id: 'b1', text: '📦 Mi pedido' }, { id: 'b2', text: '💳 Pagos' }, { id: 'b3', text: '🗣️ Hablar con agente' }], isBot: true, createdAt: new Date(Date.now() - 7100000).toISOString() },
      { id: 'm3', conversationId: 'conv-1', sender: 'user', content: '📦 Mi pedido', type: 'text', isBot: false, createdAt: new Date(Date.now() - 7000000).toISOString() },
      { id: 'm4', conversationId: 'conv-1', sender: 'bot', content: 'Por favor, indícame el número de tu pedido para poder ayudarte.', type: 'text', isBot: true, createdAt: new Date(Date.now() - 6900000).toISOString() },
      { id: 'm5', conversationId: 'conv-1', sender: 'user', content: 'Necesito ayuda con mi pedido', type: 'text', isBot: false, createdAt: new Date().toISOString() },
    ],
    tags: [{ id: 't1', name: 'Pedido', color: '#3b82f6', conversationId: 'conv-1' }],
    notes: [{ id: 'n1', content: 'Cliente VIP - prioridad alta', author: 'Carlos López', createdAt: new Date(Date.now() - 1800000).toISOString() }],
  },
  {
    id: 'conv-2', botId: 'bot-1', channel: 'messenger', contactName: 'María López',
    lastMessage: '¿Cuáles son los precios?', status: 'active', assignedTo: 'María Rodríguez',
    team: 'Ventas', unread: 1, createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { id: 'm6', conversationId: 'conv-2', sender: 'user', content: 'Hola, estoy interesada en sus productos', type: 'text', isBot: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm7', conversationId: 'conv-2', sender: 'bot', content: '¡Hola María! 🎉 Me alegra que te intereses en nuestros productos. ¿Qué categoría te interesa?', type: 'buttons', buttons: [{ id: 'b4', text: '🏠 Hogar' }, { id: 'b5', text: '💻 Tecnología' }, { id: 'b6', text: '👕 Moda' }], isBot: true, createdAt: new Date(Date.now() - 7100000).toISOString() },
      { id: 'm8', conversationId: 'conv-2', sender: 'user', content: '¿Cuáles son los precios?', type: 'text', isBot: false, createdAt: new Date().toISOString() },
    ],
    tags: [{ id: 't2', name: 'Ventas', color: '#f59e0b', conversationId: 'conv-2' }, { id: 't3', name: 'Interesada', color: '#10b981', conversationId: 'conv-2' }],
    notes: [],
  },
  {
    id: 'conv-3', botId: 'bot-1', channel: 'telegram', contactName: 'Carlos Ruiz',
    lastMessage: 'Mi aplicación no funciona', status: 'pending', assignedTo: undefined,
    team: undefined, unread: 2, createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      { id: 'm9', conversationId: 'conv-3', sender: 'user', content: 'Mi aplicación no funciona', type: 'text', isBot: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'm10', conversationId: 'conv-3', sender: 'bot', content: 'Lamento los inconvenientes. ¿Puedes describir el problema?', type: 'text', isBot: true, createdAt: new Date(Date.now() - 86300000).toISOString() },
    ],
    tags: [{ id: 't4', name: 'Bug', color: '#ef4444', conversationId: 'conv-3' }],
    notes: [{ id: 'n2', content: 'Posible bug en la versión 2.3.1', author: 'Luis Martínez', createdAt: new Date(Date.now() - 7200000).toISOString() }],
  },
  {
    id: 'conv-4', botId: 'bot-1', channel: 'whatsapp', contactName: 'Ana Torres',
    lastMessage: 'Gracias por la ayuda', status: 'closed', assignedTo: 'Ana García',
    team: 'Soporte General', unread: 0, createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      { id: 'm11', conversationId: 'conv-4', sender: 'user', content: '¿Cómo puedo cambiar mi dirección de envío?', type: 'text', isBot: false, createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: 'm12', conversationId: 'conv-4', sender: 'bot', content: 'Para cambiar tu dirección de envío, sigue estos pasos:\n1. Ve a Mi Cuenta\n2. Selecciona Direcciones\n3. Haz clic en Editar', type: 'text', isBot: true, createdAt: new Date(Date.now() - 172700000).toISOString() },
      { id: 'm13', conversationId: 'conv-4', sender: 'user', content: 'Gracias por la ayuda', type: 'text', isBot: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    tags: [{ id: 't5', name: 'Resuelto', color: '#10b981', conversationId: 'conv-4' }],
    notes: [],
  },
]

const defaultBots: Bot[] = [
  {
    id: 'bot-1', name: 'Asistente Ventas', description: 'Bot principal para automatización de ventas y soporte',
    status: 'active', channels: ['whatsapp', 'messenger', 'telegram'],
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date().toISOString(),
    flows: [
      {
        id: 'flow-1', name: 'Flujo de Bienvenida', botId: 'bot-1', isActive: true,
        trigger: { type: 'first_message' },
        nodes: [
          { id: 'node-1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Inicio' } },
          { id: 'node-2', type: 'message', position: { x: 350, y: 100 }, data: { label: 'Bienvenida', content: '¡Hola! 👋 Bienvenido a nuestro servicio de atención. ¿En qué puedo ayudarte hoy?' } },
          { id: 'node-3', type: 'buttons', position: { x: 600, y: 100 }, data: { label: 'Menú Principal', buttons: [{ id: 'b1', text: '📦 Mi pedido', nextNodeId: 'node-4' }, { id: 'b2', text: '💳 Pagos', nextNodeId: 'node-5' }, { id: 'b3', text: '🗣️ Hablar con agente', nextNodeId: 'node-6' }] } },
          { id: 'node-4', type: 'message', position: { x: 850, y: 0 }, data: { label: 'Info Pedido', content: 'Por favor, indícame el número de tu pedido para poder ayudarte.' } },
          { id: 'node-5', type: 'message', position: { x: 850, y: 100 }, data: { label: 'Info Pagos', content: 'Aceptamos tarjetas de crédito, PayPal y transferencia bancaria.' } },
          { id: 'node-6', type: 'transfer', position: { x: 850, y: 200 }, data: { label: 'Transferir', transferTeam: 'team-1', transferMessage: 'Te estoy transfiriendo con un agente. Un momento por favor...' } },
        ],
        edges: [
          { id: 'e-1-2', source: 'node-1', target: 'node-2' },
          { id: 'e-2-3', source: 'node-2', target: 'node-3' },
          { id: 'e-3-4', source: 'node-3', target: 'node-4', sourceHandle: 'b1', label: '📦 Mi pedido' },
          { id: 'e-3-5', source: 'node-3', target: 'node-5', sourceHandle: 'b2', label: '💳 Pagos' },
          { id: 'e-3-6', source: 'node-3', target: 'node-6', sourceHandle: 'b3', label: '🗣️ Agente' },
        ],
      },
    ],
  },
  {
    id: 'bot-2', name: 'Bot Soporte Técnico', description: 'Asistente especializado en soporte técnico',
    status: 'active', channels: ['whatsapp', 'telegram'],
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    updatedAt: new Date().toISOString(),
    flows: [
      {
        id: 'flow-2', name: 'Soporte Técnico', botId: 'bot-2', isActive: true,
        trigger: { type: 'first_message' },
        nodes: [
          { id: 'node-1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Inicio' } },
          { id: 'node-2', type: 'message', position: { x: 350, y: 100 }, data: { label: 'Bienvenida', content: '¡Hola! Soy el asistente de soporte técnico. ¿Qué problema estás experimentando?' } },
          { id: 'node-3', type: 'buttons', position: { x: 600, y: 100 }, data: { label: 'Tipo Problema', buttons: [{ id: 'b1', text: '📱 App no funciona', nextNodeId: 'node-4' }, { id: 'b2', text: '🌐 Problema web', nextNodeId: 'node-5' }, { id: 'b3', text: '🔧 Otro', nextNodeId: 'node-6' }] } },
          { id: 'node-4', type: 'transfer', position: { x: 850, y: 0 }, data: { label: 'Transferir App', transferTeam: 'team-3', transferMessage: 'Te transferiré al equipo de soporte técnico especializado en apps.' } },
          { id: 'node-5', type: 'transfer', position: { x: 850, y: 100 }, data: { label: 'Transferir Web', transferTeam: 'team-3', transferMessage: 'Te transferiré al equipo de soporte técnico web.' } },
          { id: 'node-6', type: 'ai_response', position: { x: 850, y: 200 }, data: { label: 'IA Responde', aiPrompt: 'Ayuda al usuario con su problema técnico de forma general.' } },
        ],
        edges: [
          { id: 'e-1-2', source: 'node-1', target: 'node-2' },
          { id: 'e-2-3', source: 'node-2', target: 'node-3' },
          { id: 'e-3-4', source: 'node-3', target: 'node-4', sourceHandle: 'b1', label: '📱 App' },
          { id: 'e-3-5', source: 'node-3', target: 'node-5', sourceHandle: 'b2', label: '🌐 Web' },
          { id: 'e-3-6', source: 'node-3', target: 'node-6', sourceHandle: 'b3', label: '🔧 Otro' },
        ],
      },
    ],
  },
]

export const useChatbotStore = create<ChatbotStore>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  bots: defaultBots,
  selectedBotId: null,
  addBot: (bot) => set((s) => ({ bots: [...s.bots, bot] })),
  updateBot: (id, data) => set((s) => ({ bots: s.bots.map((b) => b.id === id ? { ...b, ...data } : b) })),
  deleteBot: (id) => set((s) => ({ bots: s.bots.filter((b) => b.id !== id) })),
  selectBot: (id) => set({ selectedBotId: id }),
  
  selectedFlowId: null,
  selectFlow: (id) => set({ selectedFlowId: id }),
  addFlow: (botId, flow) => set((s) => ({
    bots: s.bots.map((b) => b.id === botId ? { ...b, flows: [...b.flows, flow] } : b),
  })),
  updateFlowNodes: (flowId, nodes) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, nodes } : f),
    })),
  })),
  updateFlowEdges: (flowId, edges) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, edges } : f),
    })),
  })),
  addFlowNode: (flowId, node) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? { ...f, nodes: [...f.nodes, node] } : f),
    })),
  })),
  updateFlowNode: (flowId, nodeId, data) => set((s) => ({
    bots: s.bots.map((b) => ({
      ...b,
      flows: b.flows.map((f) => f.id === flowId ? {
        ...f,
        nodes: f.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
      } : f),
    })),
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
  })),
  
  conversations: defaultConversations,
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
  
  channels: defaultChannels,
  updateChannel: (id, data) => set((s) => ({
    channels: s.channels.map((c) => c.id === id ? { ...c, ...data } : c),
  })),
  
  teams: defaultTeams,
  addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
  updateTeam: (id, data) => set((s) => ({ teams: s.teams.map((t) => t.id === id ? { ...t, ...data } : t) })),
  deleteTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
  
  draggedNodeType: null,
  setDraggedNodeType: (type) => set({ draggedNodeType: type }),
}))
