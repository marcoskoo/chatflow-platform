'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useChatbotStore, type FlowNode, type FlowEdge } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'
import {
  Button, Input, Textarea, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/chatbot/ui'
import {
  Play, MessageSquare, ToggleRight, GitBranch, Send, UserPlus,
  MousePointerClick, Brain, Trash2, Settings, Save, ArrowLeft,
  GripVertical, Plus, X, Move, ChevronDown, PanelLeft, PanelRight, ZoomIn, ZoomOut,
  Variable, Clock, Network, Shuffle, Globe, Star, Code,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const nodeTypes: { type: FlowNode['type']; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { type: 'start', label: 'Inicio', icon: <Play className="w-4 h-4" />, color: 'bg-emerald-500', description: 'Punto de entrada del flujo' },
  { type: 'message', label: 'Mensaje', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-blue-500', description: 'Enviar un mensaje de texto' },
  { type: 'buttons', label: 'Botones', icon: <ToggleRight className="w-4 h-4" />, color: 'bg-purple-500', description: 'Mensaje con botones clicables' },
  { type: 'condition', label: 'Condición', icon: <GitBranch className="w-4 h-4" />, color: 'bg-amber-500', description: 'Bifurcar según condición' },
  { type: 'action', label: 'Acción', icon: <Send className="w-4 h-4" />, color: 'bg-cyan-500', description: 'Ejecutar una acción' },
  { type: 'transfer', label: 'Transferir', icon: <UserPlus className="w-4 h-4" />, color: 'bg-rose-500', description: 'Transferir a operador/equipo' },
  { type: 'input', label: 'Entrada', icon: <MousePointerClick className="w-4 h-4" />, color: 'bg-teal-500', description: 'Esperar entrada del usuario' },
  { type: 'ai_response', label: 'Respuesta IA', icon: <Brain className="w-4 h-4" />, color: 'bg-violet-500', description: 'Respuesta generada por IA' },
  // New advanced node types
  { type: 'set_variable', label: 'Variable', icon: <Variable className="w-4 h-4" />, color: 'bg-indigo-500', description: 'Asignar valor a variable persistente del usuario' },
  { type: 'http_request', label: 'HTTP', icon: <Network className="w-4 h-4" />, color: 'bg-orange-500', description: 'Llamar a una API externa y usar la respuesta' },
  { type: 'delay', label: 'Espera', icon: <Clock className="w-4 h-4" />, color: 'bg-slate-500', description: 'Pausar el flujo por N milisegundos' },
  { type: 'subflow', label: 'Sub-flujo', icon: <Code className="w-4 h-4" />, color: 'bg-fuchsia-500', description: 'Saltar a otro flujo reutilizable' },
  { type: 'random', label: 'Aleatorio', icon: <Shuffle className="w-4 h-4" />, color: 'bg-pink-500', description: 'Ramificar aleatoriamente con pesos' },
  { type: 'ab_assign', label: 'A/B Test', icon: <Star className="w-4 h-4" />, color: 'bg-yellow-500', description: 'Asignar usuario a variante A/B' },
  { type: 'language_switch', label: 'Idioma', icon: <Globe className="w-4 h-4" />, color: 'bg-sky-500', description: 'Cambiar idioma de la conversación' },
  { type: 'csat', label: 'Encuesta CSAT', icon: <Star className="w-4 h-4" />, color: 'bg-lime-500', description: 'Solicitar calificación de satisfacción' },
]

export function FlowBuilder() {
  const {
    bots, selectedBotId, selectedFlowId, updateFlowNodes, updateFlowEdges,
    addFlowNode, updateFlowNode, deleteFlowNode, setCurrentView, teams,
  } = useChatbotStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [connectingHandle, setConnectingHandle] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [editButtons, setEditButtons] = useState<{ id: string; text: string }[]>([])
  const [editContent, setEditContent] = useState('')
  const [editTransferTeam, setEditTransferTeam] = useState('')
  const [editTransferMsg, setEditTransferMsg] = useState('')
  const [editAiPrompt, setEditAiPrompt] = useState('')
  // New node-type edit state
  const [editVariableName, setEditVariableName] = useState('')
  const [editVariableValue, setEditVariableValue] = useState('')
  const [editHttpUrl, setEditHttpUrl] = useState('')
  const [editHttpMethod, setEditHttpMethod] = useState('GET')
  const [editHttpBody, setEditHttpBody] = useState('')
  const [editDelayMs, setEditDelayMs] = useState(1000)
  const [editSubflowId, setEditSubflowId] = useState('')
  const [editLanguage, setEditLanguage] = useState('es')
  const [editCsatPrompt, setEditCsatPrompt] = useState('¿Cómo calificarías tu experiencia?')
  const [editRandomBranches, setEditRandomBranches] = useState<{ id: string; label: string; weight: number }[]>([
    { id: 'a', label: 'Rama A', weight: 50 },
    { id: 'b', label: 'Rama B', weight: 50 },
  ])
  const isMobile = useIsMobile()
  const [showMobilePalette, setShowMobilePalette] = useState(false)
  const [canvasScale, setCanvasScale] = useState(1)
  const lastTouchDist = useRef<number | null>(null)
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)

  const bot = bots.find(b => b.id === selectedBotId)
  const flow = bot?.flows.find(f => f.id === selectedFlowId)

  // Touch support for mobile (pinch-to-zoom + pan) - hooks must be called before any early return
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      setIsPanning(true)
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scaleDelta = dist / lastTouchDist.current
      setCanvasScale(prev => Math.min(3, Math.max(0.3, prev * scaleDelta)))
      lastTouchDist.current = dist
    } else if (e.touches.length === 1 && isPanning) {
      const dx = e.touches[0].clientX - panStart.x
      const dy = e.touches[0].clientY - panStart.y
      setCanvasOffset(prev => ({ x: prev.x + dx / canvasScale, y: prev.y + dy / canvasScale }))
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }, [isPanning, panStart, canvasScale])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
    lastTouchCenter.current = null
    setIsPanning(false)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setCanvasOffset(prev => ({ x: prev.x + dx / canvasScale, y: prev.y + dy / canvasScale }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (draggingNode && flow) {
      const x = (e.clientX - rect.left - dragOffset.x) / canvasScale - canvasOffset.x
      const y = (e.clientY - rect.top - dragOffset.y) / canvasScale - canvasOffset.y
      const newNodes = flow.nodes.map(n =>
        n.id === draggingNode ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n
      )
      updateFlowNodes(flow.id, newNodes)
    }

    if (connectingFrom) {
      setMousePos({ x: (e.clientX - rect.left) / canvasScale - canvasOffset.x, y: (e.clientY - rect.top) / canvasScale - canvasOffset.y })
    }
  }

  if (!bot || !flow) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Selecciona un flujo</h2>
          <p className="text-sm">Ve a Chatbots y selecciona un flujo para editar</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setCurrentView('bots')}>
            Ver Chatbots
          </Button>
        </div>
      </div>
    )
  }

  const selectedNode = flow.nodes.find(n => n.id === selectedNodeId)

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('nodeType') as FlowNode['type']
    if (!nodeType) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / canvasScale - canvasOffset.x
    const y = (e.clientY - rect.top) / canvasScale - canvasOffset.y

    const typeInfo = nodeTypes.find(t => t.type === nodeType)
    const newNode: FlowNode = {
      id: uuidv4(),
      type: nodeType,
      position: { x, y },
      data: {
        label: typeInfo?.label || 'Nodo',
        content: nodeType === 'message' ? 'Escribe tu mensaje aquí...' : undefined,
        buttons: nodeType === 'buttons' ? [{ id: uuidv4(), text: 'Opción 1' }, { id: uuidv4(), text: 'Opción 2' }] : undefined,
        transferTeam: nodeType === 'transfer' ? teams[0]?.id : undefined,
        transferMessage: nodeType === 'transfer' ? 'Te estoy transfiriendo con un agente...' : undefined,
        aiPrompt: nodeType === 'ai_response' ? 'Ayuda al usuario con su consulta.' : undefined,
      },
    }
    addFlowNode(flow.id, newNode)
  }

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = flow.nodes.find(n => n.id === nodeId)
    if (!node) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDraggingNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - (node.position.x + canvasOffset.x) * canvasScale,
      y: e.clientY - rect.top - (node.position.y + canvasOffset.y) * canvasScale,
    })
  }

  const handleMouseUp = () => {
    setDraggingNode(null)
    if (isPanning) setIsPanning(false)
  }

  const handleOutputClick = (nodeId: string, handle?: string) => {
    if (connectingFrom === nodeId) {
      setConnectingFrom(null)
      setConnectingHandle(null)
      return
    }
    if (connectingFrom && connectingFrom !== nodeId) {
      const exists = flow.edges.some(e => e.source === connectingFrom && e.target === nodeId && e.sourceHandle === connectingHandle)
      if (!exists) {
        const newEdge: FlowEdge = {
          id: uuidv4(),
          source: connectingFrom,
          target: nodeId,
          sourceHandle: connectingHandle || undefined,
          label: connectingHandle ? flow.nodes.find(n => n.id === connectingFrom)?.data.buttons?.find(b => b.id === connectingHandle)?.text : undefined,
        }
        updateFlowEdges(flow.id, [...flow.edges, newEdge])
      }
      setConnectingFrom(null)
      setConnectingHandle(null)
    } else {
      setConnectingFrom(nodeId)
      setConnectingHandle(handle || null)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    deleteFlowNode(flow.id, nodeId)
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
      setShowNodeEditor(false)
    }
  }

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    const node = flow.nodes.find(n => n.id === nodeId)
    if (node) {
      setEditContent(node.data.content || '')
      setEditButtons(node.data.buttons || [])
      setEditTransferTeam(node.data.transferTeam || '')
      setEditTransferMsg(node.data.transferMessage || '')
      setEditAiPrompt(node.data.aiPrompt || '')
      setEditVariableName(node.data.variableName || '')
      setEditVariableValue(node.data.variableValue || '')
      setEditHttpUrl(node.data.httpRequestUrl || '')
      setEditHttpMethod(node.data.httpMethod || 'GET')
      setEditHttpBody(node.data.httpBody || '')
      setEditDelayMs(node.data.delayMs ?? 1000)
      setEditSubflowId(node.data.subflowId || node.data.abTestFlowId || '')
      setEditLanguage(node.data.language || 'es')
      setEditCsatPrompt(node.data.csatPrompt || '¿Cómo calificarías tu experiencia?')
      setEditRandomBranches(node.data.randomBranches && node.data.randomBranches.length > 0
        ? node.data.randomBranches
        : [{ id: 'a', label: 'Rama A', weight: 50 }, { id: 'b', label: 'Rama B', weight: 50 }])
      setShowNodeEditor(true)
    }
  }

  const handleSaveNodeEdit = () => {
    if (!selectedNodeId) return
    updateFlowNode(flow.id, selectedNodeId, {
      content: editContent,
      buttons: editButtons,
      transferTeam: editTransferTeam,
      transferMessage: editTransferMsg,
      aiPrompt: editAiPrompt,
      variableName: editVariableName,
      variableValue: editVariableValue,
      httpRequestUrl: editHttpUrl,
      httpMethod: editHttpMethod,
      httpBody: editHttpBody,
      delayMs: editDelayMs,
      subflowId: editSubflowId,
      abTestFlowId: editSubflowId,
      language: editLanguage,
      csatPrompt: editCsatPrompt,
      randomBranches: editRandomBranches,
    })
  }

  // Handle adding node on mobile from palette
  const handleMobileAddNode = (nodeType: FlowNode['type']) => {
    const typeInfo = nodeTypes.find(t => t.type === nodeType)
    const newNode: FlowNode = {
      id: uuidv4(),
      type: nodeType,
      position: { x: -canvasOffset.x + 100, y: -canvasOffset.y + 100 },
      data: {
        label: typeInfo?.label || 'Nodo',
        content: nodeType === 'message' ? 'Escribe tu mensaje aquí...' : undefined,
        buttons: nodeType === 'buttons' ? [{ id: uuidv4(), text: 'Opción 1' }, { id: uuidv4(), text: 'Opción 2' }] : undefined,
        transferTeam: nodeType === 'transfer' ? teams[0]?.id : undefined,
        transferMessage: nodeType === 'transfer' ? 'Te estoy transfiriendo con un agente...' : undefined,
        aiPrompt: nodeType === 'ai_response' ? 'Ayuda al usuario con su consulta.' : undefined,
      },
    }
    addFlowNode(flow.id, newNode)
    setShowMobilePalette(false)
  }

  const getNodeColor = (type: FlowNode['type']) => {
    return nodeTypes.find(t => t.type === type)?.color || 'bg-slate-500'
  }

  const getNodeIcon = (type: FlowNode['type']) => {
    return nodeTypes.find(t => t.type === type)?.icon || <Settings className="w-4 h-4" />
  }

  const renderNode = (node: FlowNode) => {
    const isSelected = selectedNodeId === node.id
    const isConnecting = connectingFrom === node.id
    const nodeW = node.type === 'buttons' ? 220 : node.type === 'condition' ? 180 : 180

    return (
      <div
        key={node.id}
        className={`absolute select-none group ${isSelected ? 'z-20' : 'z-10'}`}
        style={{ left: node.position.x, top: node.position.y, width: nodeW }}
        onDoubleClick={() => handleSelectNode(node.id)}
      >
        <div
          className={`rounded-xl border-2 shadow-lg cursor-move transition-all ${
            isSelected ? 'border-emerald-400 shadow-emerald-200/50' :
            isConnecting ? 'border-emerald-400 animate-pulse' :
            'border-slate-200 hover:border-slate-300'
          } bg-white`}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
          onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id) }}
        >
          <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[10px] text-white text-xs font-semibold ${getNodeColor(node.type)}`}>
            {getNodeIcon(node.type)}
            <span className="truncate">{node.data.label}</span>
          </div>

          <div className="px-3 py-2 text-[11px] text-slate-600 min-h-[32px]">
            {node.type === 'message' && <p className="truncate">{node.data.content}</p>}
            {node.type === 'buttons' && (
              <div className="space-y-1">
                {node.data.buttons?.map(b => (
                  <div key={b.id} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-[10px] font-medium truncate">
                    {b.text}
                  </div>
                ))}
              </div>
            )}
            {node.type === 'condition' && <p className="truncate text-amber-600">Si {node.data.conditionField || '...'} {node.data.conditionOperator || '='} {node.data.conditionValue || '...'}</p>}
            {node.type === 'transfer' && <p className="truncate text-rose-600">→ {teams.find(t => t.id === node.data.transferTeam)?.name || 'Equipo'}</p>}
            {node.type === 'ai_response' && <p className="truncate text-violet-600">🤖 {node.data.aiPrompt?.substring(0, 30) || 'Prompt IA...'}</p>}
            {node.type === 'start' && <p className="text-emerald-600">▶ Punto de inicio</p>}
            {node.type === 'input' && <p className="truncate">💾 Guardar en: {node.data.variableName || 'variable'}</p>}
            {node.type === 'action' && <p className="truncate">⚡ {node.data.actionType || 'Acción'}</p>}
          </div>

          {node.type !== 'start' && (
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer z-30"
              onClick={(e) => { e.stopPropagation(); handleOutputClick(node.id) }}
              title="Conectar entrada"
            />
          )}

          {node.type === 'buttons' ? (
            <div className="absolute -right-2 flex flex-col gap-1" style={{ top: '50%', transform: 'translateY(-50%)' }}>
              {node.data.buttons?.map((b, idx) => (
                <div
                  key={b.id}
                  className="w-4 h-4 rounded-full bg-white border-2 border-purple-300 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer z-30"
                  style={{ marginTop: idx === 0 ? 0 : 4 }}
                  onClick={(e) => { e.stopPropagation(); handleOutputClick(node.id, b.id) }}
                  title={`Conectar: ${b.text}`}
                />
              ))}
            </div>
          ) : (
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer z-30"
              onClick={(e) => { e.stopPropagation(); handleOutputClick(node.id) }}
              title="Conectar salida"
            />
          )}

          {isSelected && (
            <button
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors z-30"
              onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id) }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderEdge = (edge: FlowEdge) => {
    const sourceNode = flow.nodes.find(n => n.id === edge.source)
    const targetNode = flow.nodes.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return null

    const sourceW = sourceNode.type === 'buttons' ? 220 : 180
    let sx: number, sy: number

    if (edge.sourceHandle && sourceNode.type === 'buttons') {
      const btnIdx = sourceNode.data.buttons?.findIndex(b => b.id === edge.sourceHandle) ?? 0
      sx = sourceNode.position.x + sourceW + 2
      sy = sourceNode.position.y + 40 + btnIdx * 24
    } else {
      sx = sourceNode.position.x + sourceW + 2
      sy = sourceNode.position.y + 30
    }

    const tx = targetNode.position.x - 2
    const ty = targetNode.position.y + 30

    const midX = (sx + tx) / 2

    return (
      <g key={edge.id}>
        <path
          d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
          fill="none"
          stroke={connectingFrom === edge.source ? '#10b981' : '#94a3b8'}
          strokeWidth="2"
          className="transition-colors"
        />
        {edge.label && (
          <text
            x={midX}
            y={(sy + ty) / 2 - 8}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 font-medium"
          >
            {edge.label}
          </text>
        )}
        <circle cx={tx} cy={ty} r="4" fill="#94a3b8" />
      </g>
    )
  }

  const renderConnectingLine = () => {
    if (!connectingFrom) return null
    const sourceNode = flow.nodes.find(n => n.id === connectingFrom)
    if (!sourceNode) return null
    const sourceW = sourceNode.type === 'buttons' ? 220 : 180

    let sx: number, sy: number
    if (connectingHandle && sourceNode.type === 'buttons') {
      const btnIdx = sourceNode.data.buttons?.findIndex(b => b.id === connectingHandle) ?? 0
      sx = sourceNode.position.x + sourceW + 2
      sy = sourceNode.position.y + 40 + btnIdx * 24
    } else {
      sx = sourceNode.position.x + sourceW + 2
      sy = sourceNode.position.y + 30
    }

    const midX = (sx + mousePos.x) / 2

    return (
      <path
        d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
    )
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - Node Palette */}
      {!isMobile && (
        <div className="w-56 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-600 mb-2" onClick={() => setCurrentView('bots')}>
              <ArrowLeft className="w-4 h-4" /> Volver
            </Button>
            <h2 className="font-bold text-sm text-slate-900">{flow.name}</h2>
            <p className="text-xs text-slate-500">{bot.name}</p>
          </div>
          <div className="p-3 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Componentes</h3>
            <p className="text-[10px] text-slate-400 mb-2">Arrastra al canvas para agregar</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {nodeTypes.map((nt) => (
              <div
                key={nt.type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('nodeType', nt.type)}
                className="flex items-center gap-2 p-2 rounded-lg cursor-grab hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all active:cursor-grabbing"
              >
                <div className={`w-8 h-8 rounded-lg ${nt.color} text-white flex items-center justify-center flex-shrink-0`}>
                  {nt.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900">{nt.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{nt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Palette Bottom Sheet */}
      {isMobile && showMobilePalette && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePalette(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Agregar Componente</h3>
              <button onClick={() => setShowMobilePalette(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-x-auto p-3">
              <div className="flex gap-3 pb-2">
                {nodeTypes.map((nt) => (
                  <button
                    key={nt.type}
                    onClick={() => handleMobileAddNode(nt.type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-slate-50 border border-slate-200 min-w-[80px] transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg ${nt.color} text-white flex items-center justify-center`}>
                      {nt.icon}
                    </div>
                    <span className="text-[10px] font-medium text-slate-700 text-center leading-tight">{nt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Mobile Toolbar */}
        {isMobile && (
          <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 gap-2">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-600" onClick={() => setCurrentView('bots')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 min-w-0">
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                {flow.nodes.length} nodos
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-[10px]">
                {flow.edges.length} conex
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCanvasScale(s => Math.min(3, s + 0.2))} title="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCanvasScale(s => Math.max(0.3, s - 0.2))} title="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setCanvasScale(1); setCanvasOffset({ x: 0, y: 0 }) }} title="Reset">
                <Move className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowMobilePalette(true)} title="Palette">
                <PanelLeft className="w-4 h-4" />
              </Button>
              {showNodeEditor && selectedNode && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowNodeEditor(true)} title="Editor">
                  <PanelRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Desktop Canvas Header */}
        {!isMobile && (
          <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <Play className="w-3 h-3 mr-1" />
                {flow.nodes.length} nodos
              </Badge>
              <Badge variant="outline" className="text-slate-600">
                <GitBranch className="w-3 h-3 mr-1" />
                {flow.edges.length} conexiones
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Clic en ● para conectar nodos | Doble-clic para editar</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCanvasScale(s => Math.min(3, s + 0.2))} title="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-400">{Math.round(canvasScale * 100)}%</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCanvasScale(s => Math.max(0.3, s - 0.2))} title="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setCanvasOffset({ x: 0, y: 0 }); setCanvasScale(1) }}>
                Centrar
              </Button>
            </div>
          </div>
        )}

        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={(e) => {
            if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
              setIsPanning(true)
              setPanStart({ x: e.clientX, y: e.clientY })
              setSelectedNodeId(null)
              setShowNodeEditor(false)
            }
          }}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          style={{ cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default', touchAction: isMobile ? 'none' : 'auto' }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
              backgroundSize: `${20 * canvasScale}px ${20 * canvasScale}px`,
              transform: `translate(${canvasOffset.x * canvasScale}px, ${canvasOffset.y * canvasScale}px)`,
            }}
          />

          <svg className="absolute inset-0 w-full h-full" style={{ transform: `translate(${canvasOffset.x * canvasScale}px, ${canvasOffset.y * canvasScale}px) scale(${canvasScale})`, transformOrigin: '0 0' }}>
            {flow.edges.map(renderEdge)}
            {renderConnectingLine()}
          </svg>

          <div style={{ transform: `translate(${canvasOffset.x * canvasScale}px, ${canvasOffset.y * canvasScale}px) scale(${canvasScale})`, transformOrigin: '0 0' }}>
            {flow.nodes.map(renderNode)}
          </div>
        </div>
      </div>

      {/* Desktop Node Editor Panel */}
      {!isMobile && showNodeEditor && selectedNode && (
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${getNodeColor(selectedNode.type)} text-white flex items-center justify-center`}>
                {getNodeIcon(selectedNode.type)}
              </div>
              <span className="font-semibold text-sm">{selectedNode.data.label}</span>
            </div>
            <button onClick={() => setShowNodeEditor(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Etiqueta del nodo</label>
              <Input
                value={selectedNode.data.label}
                onChange={(e) => updateFlowNode(flow.id, selectedNode.id, { label: e.target.value })}
                className="text-sm"
              />
            </div>

            {(selectedNode.type === 'message' || selectedNode.type === 'start') && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Contenido del mensaje</label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onBlur={handleSaveNodeEdit}
                  rows={4}
                  className="text-sm"
                  placeholder="Escribe el mensaje que se enviará..."
                />
              </div>
            )}

            {selectedNode.type === 'buttons' && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Mensaje arriba de botones</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                    rows={2}
                    className="text-sm"
                    placeholder="Texto descriptivo..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-700">Botones clicables</label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs gap-1"
                      onClick={() => {
                        const newBtns = [...editButtons, { id: uuidv4(), text: `Opción ${editButtons.length + 1}` }]
                        setEditButtons(newBtns)
                        updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                      }}
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editButtons.map((btn, idx) => (
                      <div key={btn.id} className="flex items-center gap-1">
                        <Input
                          value={btn.text}
                          onChange={(e) => {
                            const newBtns = editButtons.map((b, i) => i === idx ? { ...b, text: e.target.value } : b)
                            setEditButtons(newBtns)
                            updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                          }}
                          className="text-xs h-8"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => {
                            const newBtns = editButtons.filter((_, i) => i !== idx)
                            setEditButtons(newBtns)
                            updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedNode.type === 'condition' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Campo</label>
                  <Input className="text-sm h-8" placeholder="Ej: ciudad" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Operador</label>
                  <Select>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">Igual a</SelectItem>
                      <SelectItem value="neq">Diferente de</SelectItem>
                      <SelectItem value="contains">Contiene</SelectItem>
                      <SelectItem value="gt">Mayor que</SelectItem>
                      <SelectItem value="lt">Menor que</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Valor</label>
                  <Input className="text-sm h-8" placeholder="Valor de comparación" />
                </div>
              </div>
            )}

            {selectedNode.type === 'transfer' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Transferir a equipo</label>
                  <Select value={editTransferTeam} onValueChange={(v) => { setEditTransferTeam(v); updateFlowNode(flow.id, selectedNode.id, { transferTeam: v }) }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Mensaje de transferencia</label>
                  <Textarea
                    value={editTransferMsg}
                    onChange={(e) => setEditTransferMsg(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                    rows={3}
                    className="text-sm"
                    placeholder="Mensaje antes de transferir..."
                  />
                </div>
                {editTransferTeam && (
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <p className="text-xs font-medium text-rose-700">
                      Se transferirá a: {teams.find(t => t.id === editTransferTeam)?.name}
                    </p>
                    <p className="text-[10px] text-rose-500 mt-1">
                      Miembros: {teams.find(t => t.id === editTransferTeam)?.members.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === 'ai_response' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Prompt para IA</label>
                <Textarea
                  value={editAiPrompt}
                  onChange={(e) => setEditAiPrompt(e.target.value)}
                  onBlur={handleSaveNodeEdit}
                  rows={4}
                  className="text-sm"
                  placeholder="Instrucciones para la respuesta de IA..."
                />
                <p className="text-[10px] text-slate-400 mt-1">La IA generará una respuesta basada en este prompt y el contexto de la conversación.</p>
              </div>
            )}

            {selectedNode.type === 'input' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre de variable</label>
                <Input className="text-sm h-8" placeholder="Ej: email_usuario" />
                <p className="text-[10px] text-slate-400 mt-1">La respuesta del usuario se guardará en esta variable.</p>
              </div>
            )}

            {selectedNode.type === 'action' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Tipo de acción</label>
                  <Select>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_email">Enviar email</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="set_variable">Establecer variable</SelectItem>
                      <SelectItem value="api_call">Llamada API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedNode.type === 'set_variable' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre de variable</label>
                  <Input
                    className="text-sm h-8"
                    placeholder="Ej: nombre_usuario"
                    value={editVariableName}
                    onChange={(e) => setEditVariableName(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Valor</label>
                  <Input
                    className="text-sm h-8"
                    placeholder="Ej: {{user.input}} o texto fijo"
                    value={editVariableValue}
                    onChange={(e) => setEditVariableValue(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Puedes usar {`{{variables}}`} existentes como {`{{user.name}}`} o {`{{conversation.id}}`}.</p>
                </div>
              </div>
            )}

            {selectedNode.type === 'http_request' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">URL</label>
                  <Input
                    className="text-sm h-8 font-mono"
                    placeholder="https://api.ejemplo.com/v1/recurso"
                    value={editHttpUrl}
                    onChange={(e) => setEditHttpUrl(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Método</label>
                  <Select value={editHttpMethod} onValueChange={(v) => { setEditHttpMethod(v); setTimeout(handleSaveNodeEdit, 0) }}>
                    <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Body (JSON)</label>
                  <Textarea
                    rows={3}
                    className="text-sm font-mono"
                    placeholder='{ "key": "value" }'
                    value={editHttpBody}
                    onChange={(e) => setEditHttpBody(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'delay' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Espera (ms)</label>
                <Input
                  type="number"
                  className="text-sm h-8"
                  value={editDelayMs}
                  onChange={(e) => setEditDelayMs(parseInt(e.target.value) || 0)}
                  onBlur={handleSaveNodeEdit}
                />
                <p className="text-[10px] text-slate-400 mt-1">1000 ms = 1 segundo. Para mensajes secuenciales en WhatsApp se recomienda 500-2000 ms.</p>
              </div>
            )}

            {selectedNode.type === 'subflow' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Flujo destino</label>
                <Select value={editSubflowId} onValueChange={(v) => { setEditSubflowId(v); setTimeout(handleSaveNodeEdit, 0) }}>
                  <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Seleccionar flujo" /></SelectTrigger>
                  <SelectContent>
                    {bot?.flows.filter(f => f.id !== selectedFlowId).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">El flujo actual se pausará y se ejecutará el sub-flujo. Al terminar, continuará por la rama "completado".</p>
              </div>
            )}

            {selectedNode.type === 'random' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 mb-1 block">Ramas con pesos (%)</label>
                {editRandomBranches.map((b, idx) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <Input
                      className="text-sm h-8 flex-1"
                      value={b.label}
                      onChange={(e) => {
                        const next = [...editRandomBranches]
                        next[idx] = { ...b, label: e.target.value }
                        setEditRandomBranches(next)
                      }}
                      onBlur={handleSaveNodeEdit}
                    />
                    <Input
                      type="number"
                      className="text-sm h-8 w-20"
                      value={b.weight}
                      onChange={(e) => {
                        const next = [...editRandomBranches]
                        next[idx] = { ...b, weight: parseInt(e.target.value) || 0 }
                        setEditRandomBranches(next)
                      }}
                      onBlur={handleSaveNodeEdit}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditRandomBranches(editRandomBranches.filter(x => x.id !== b.id))
                        setTimeout(handleSaveNodeEdit, 0)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const id = String.fromCharCode(97 + editRandomBranches.length)
                    setEditRandomBranches([...editRandomBranches, { id, label: `Rama ${id.toUpperCase()}`, weight: 25 }])
                    setTimeout(handleSaveNodeEdit, 0)
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Añadir rama
                </Button>
              </div>
            )}

            {selectedNode.type === 'ab_assign' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Asignación A/B</label>
                <p className="text-[10px] text-slate-400 mt-1">
                  Este nodo asigna al usuario a una variante A o B según el tráfico configurado en el test activo. Crea el test en <strong>A/B Testing</strong> en el panel.
                </p>
                <Select value={editSubflowId} onValueChange={(v) => { setEditSubflowId(v); setTimeout(handleSaveNodeEdit, 0) }}>
                  <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Seleccionar test A/B" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (usar test activo del bot)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedNode.type === 'language_switch' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Idioma destino</label>
                <Select value={editLanguage} onValueChange={(v) => { setEditLanguage(v); setTimeout(handleSaveNodeEdit, 0) }}>
                  <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">Cambia el idioma de la conversación. Los nodos siguientes usarán las traducciones correspondientes.</p>
              </div>
            )}

            {selectedNode.type === 'csat' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Mensaje de encuesta</label>
                <Textarea
                  rows={2}
                  className="text-sm"
                  value={editCsatPrompt}
                  onChange={(e) => setEditCsatPrompt(e.target.value)}
                  onBlur={handleSaveNodeEdit}
                />
                <p className="text-[10px] text-slate-400 mt-1">El usuario recibirá 5 botones (1-5 estrellas). La puntuación se guarda en <code>conversation.csatScore</code>.</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1"
              onClick={() => handleDeleteNode(selectedNode.id)}
            >
              <Trash2 className="w-4 h-4" /> Eliminar Nodo
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Node Editor Dialog */}
      {isMobile && showNodeEditor && selectedNode && (
        <Dialog open={showNodeEditor} onOpenChange={setShowNodeEditor}>
          <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${getNodeColor(selectedNode.type)} text-white flex items-center justify-center`}>
                  {getNodeIcon(selectedNode.type)}
                </div>
                {selectedNode.data.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Etiqueta del nodo</label>
                <Input
                  value={selectedNode.data.label}
                  onChange={(e) => updateFlowNode(flow.id, selectedNode.id, { label: e.target.value })}
                  className="text-sm"
                />
              </div>

              {(selectedNode.type === 'message' || selectedNode.type === 'start') && (
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Contenido del mensaje</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                    rows={4}
                    className="text-sm"
                    placeholder="Escribe el mensaje que se enviará..."
                  />
                </div>
              )}

              {selectedNode.type === 'buttons' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Mensaje arriba de botones</label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onBlur={handleSaveNodeEdit}
                      rows={2}
                      className="text-sm"
                      placeholder="Texto descriptivo..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">Botones clicables</label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs gap-1"
                        onClick={() => {
                          const newBtns = [...editButtons, { id: uuidv4(), text: `Opción ${editButtons.length + 1}` }]
                          setEditButtons(newBtns)
                          updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                        }}
                      >
                        <Plus className="w-3 h-3" /> Agregar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editButtons.map((btn, idx) => (
                        <div key={btn.id} className="flex items-center gap-1">
                          <Input
                            value={btn.text}
                            onChange={(e) => {
                              const newBtns = editButtons.map((b, i) => i === idx ? { ...b, text: e.target.value } : b)
                              setEditButtons(newBtns)
                              updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                            }}
                            className="text-xs h-8"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => {
                              const newBtns = editButtons.filter((_, i) => i !== idx)
                              setEditButtons(newBtns)
                              updateFlowNode(flow.id, selectedNode.id, { buttons: newBtns })
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Campo</label>
                    <Input className="text-sm h-8" placeholder="Ej: ciudad" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Operador</label>
                    <Select>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">Igual a</SelectItem>
                        <SelectItem value="neq">Diferente de</SelectItem>
                        <SelectItem value="contains">Contiene</SelectItem>
                        <SelectItem value="gt">Mayor que</SelectItem>
                        <SelectItem value="lt">Menor que</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Valor</label>
                    <Input className="text-sm h-8" placeholder="Valor de comparación" />
                  </div>
                </div>
              )}

              {selectedNode.type === 'transfer' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Transferir a equipo</label>
                    <Select value={editTransferTeam} onValueChange={(v) => { setEditTransferTeam(v); updateFlowNode(flow.id, selectedNode.id, { transferTeam: v }) }}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                      <SelectContent>
                        {teams.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Mensaje de transferencia</label>
                    <Textarea
                      value={editTransferMsg}
                      onChange={(e) => setEditTransferMsg(e.target.value)}
                      onBlur={handleSaveNodeEdit}
                      rows={3}
                      className="text-sm"
                      placeholder="Mensaje antes de transferir..."
                    />
                  </div>
                  {editTransferTeam && (
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <p className="text-xs font-medium text-rose-700">
                        Se transferirá a: {teams.find(t => t.id === editTransferTeam)?.name}
                      </p>
                      <p className="text-[10px] text-rose-500 mt-1">
                        Miembros: {teams.find(t => t.id === editTransferTeam)?.members.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === 'ai_response' && (
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Prompt para IA</label>
                  <Textarea
                    value={editAiPrompt}
                    onChange={(e) => setEditAiPrompt(e.target.value)}
                    onBlur={handleSaveNodeEdit}
                    rows={4}
                    className="text-sm"
                    placeholder="Instrucciones para la respuesta de IA..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">La IA generará una respuesta basada en este prompt y el contexto de la conversación.</p>
                </div>
              )}

              {selectedNode.type === 'input' && (
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre de variable</label>
                  <Input className="text-sm h-8" placeholder="Ej: email_usuario" />
                  <p className="text-[10px] text-slate-400 mt-1">La respuesta del usuario se guardará en esta variable.</p>
                </div>
              )}

              {selectedNode.type === 'action' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Tipo de acción</label>
                    <Select>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_email">Enviar email</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="set_variable">Establecer variable</SelectItem>
                        <SelectItem value="api_call">Llamada API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-1"
                  onClick={() => { handleDeleteNode(selectedNode.id); setShowNodeEditor(false) }}
                >
                  <Trash2 className="w-4 h-4" /> Eliminar Nodo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
