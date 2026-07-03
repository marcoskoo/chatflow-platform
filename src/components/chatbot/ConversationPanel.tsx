'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useChatbotStore, type Message, type Tag, type Note } from '@/lib/store'
import {
  Button, Input, Badge, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ScrollArea,
} from '@/components/chatbot/ui'
import {
  MessageSquare, Tag as TagIcon, StickyNote, UserPlus, Search, Filter,
  Send, Phone, MoreVertical, Clock, Bot, User, HeadphonesIcon,
  Plus, X, Hash, Paperclip, Smile, Check,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const tagColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function ConversationPanel() {
  const {
    conversations, selectedConversationId, selectConversation,
    addMessage, addTag, removeTag, addNote, transferConversation, teams,
  } = useChatbotStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [messageInput, setMessageInput] = useState('')
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(tagColors[0])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [transferTeamId, setTransferTeamId] = useState('')
  const [transferAgentId, setTransferAgentId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConv = conversations.find(c => c.id === selectedConversationId)

  const filteredConvs = conversations.filter(c => {
    const matchSearch = !searchTerm || c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || c.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchChannel = filterChannel === 'all' || c.channel === filterChannel
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchChannel && matchStatus
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConv?.messages?.length])

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConv) return
    const msg: Message = {
      id: uuidv4(),
      conversationId: selectedConv.id,
      sender: 'agent',
      content: messageInput.trim(),
      type: 'text',
      isBot: false,
      createdAt: new Date().toISOString(),
    }
    addMessage(selectedConv.id, msg)
    setMessageInput('')
  }

  const handleAddTag = () => {
    if (!newTagName.trim() || !selectedConv) return
    const tag: Tag = {
      id: uuidv4(),
      name: newTagName.trim(),
      color: newTagColor,
      conversationId: selectedConv.id,
    }
    addTag(selectedConv.id, tag)
    setNewTagName('')
    setShowTagDialog(false)
  }

  const handleAddNote = () => {
    if (!newNoteContent.trim() || !selectedConv) return
    const note: Note = {
      id: uuidv4(),
      content: newNoteContent.trim(),
      author: 'Agente',
      createdAt: new Date().toISOString(),
    }
    addNote(selectedConv.id, note)
    setNewNoteContent('')
    setShowNoteDialog(false)
  }

  const handleTransfer = () => {
    if (!transferTeamId || !selectedConv) return
    const team = teams.find(t => t.id === transferTeamId)
    transferConversation(selectedConv.id, team?.name || '', transferAgentId || undefined)
    const transferMsg: Message = {
      id: uuidv4(),
      conversationId: selectedConv.id,
      sender: 'bot',
      content: `Conversación transferida al equipo ${team?.name}${transferAgentId ? ` - Agente: ${transferAgentId}` : ''}. Un momento por favor...`,
      type: 'transfer',
      isBot: true,
      createdAt: new Date().toISOString(),
    }
    addMessage(selectedConv.id, transferMsg)
    setShowTransferDialog(false)
    setTransferTeamId('')
    setTransferAgentId('')
  }

  const channelIcon = (ch: string) => ch === 'whatsapp' ? '💬' : ch === 'messenger' ? '💬' : ch === 'instagram' ? '📸' : '✈️'
  const channelLabel = (ch: string) => ch === 'whatsapp' ? 'WhatsApp' : ch === 'messenger' ? 'Messenger' : ch === 'instagram' ? 'Instagram' : 'Telegram'

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900">Conversaciones</h2>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{conversations.length}</Badge>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversación..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'whatsapp', 'messenger', 'instagram', 'telegram'].map(ch => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  filterChannel === ch ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ch === 'all' ? 'Todos' : channelIcon(ch)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['all', 'active', 'pending', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  filterStatus === s ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'active' ? 'Activas' : s === 'pending' ? 'Pendientes' : 'Cerradas'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((conv) => {
            const isActive = selectedConversationId === conv.id
            const statusDot = conv.status === 'active' ? 'bg-emerald-400' : conv.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`p-3 cursor-pointer border-b border-slate-100 transition-colors ${
                  isActive ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {conv.contactName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusDot} rounded-full border-2 border-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-900 truncate">{conv.contactName}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(conv.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs">{channelIcon(conv.channel)}</span>
                      <p className="text-xs text-slate-500 truncate flex-1">{conv.lastMessage}</p>
                      {conv.unread > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    {conv.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {conv.tags.slice(0, 3).map(tag => (
                          <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                {selectedConv.contactName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{selectedConv.contactName}</span>
                  <span className="text-xs">{channelIcon(selectedConv.channel)} {channelLabel(selectedConv.channel)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    selectedConv.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    selectedConv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedConv.status === 'active' ? 'Activa' : selectedConv.status === 'pending' ? 'Pendiente' : 'Cerrada'}
                  </span>
                  {selectedConv.assignedTo && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> {selectedConv.assignedTo}
                    </span>
                  )}
                  {selectedConv.team && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{selectedConv.team}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Tag button */}
              <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
                    <TagIcon className="w-4 h-4" /> Etiqueta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Etiqueta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {selectedConv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedConv.tags.map(tag => (
                          <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color }} className="gap-1">
                            {tag.name}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(selectedConv.id, tag.id)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nombre de la etiqueta"
                      className="text-sm"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {tagColors.map(c => (
                        <button
                          key={c}
                          className={`w-7 h-7 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewTagColor(c)}
                        />
                      ))}
                    </div>
                    <Button onClick={handleAddTag} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!newTagName.trim()}>
                      Agregar Etiqueta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Note button */}
              <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
                    <StickyNote className="w-4 h-4" /> Nota
                    {selectedConv.notes.length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {selectedConv.notes.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notas de Conversación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {selectedConv.notes.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedConv.notes.map(note => (
                          <div key={note.id} className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-sm text-slate-700">{note.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500">{note.author}</span>
                              <span className="text-[10px] text-slate-400">{formatTime(note.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Agregar una nota a esta conversación..."
                      rows={3}
                    />
                    <Button onClick={handleAddNote} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!newNoteContent.trim()}>
                      Guardar Nota
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Transfer button */}
              <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-rose-600 hover:text-rose-700">
                    <UserPlus className="w-4 h-4" /> Transferir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transferir Conversación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Equipo destino</label>
                      <Select value={transferTeamId} onValueChange={(v) => { setTransferTeamId(v); setTransferAgentId('') }}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                        <SelectContent>
                          {teams.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {transferTeamId && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Agente específico (opcional)</label>
                        <Select value={transferAgentId} onValueChange={setTransferAgentId}>
                          <SelectTrigger><SelectValue placeholder="Cualquier agente disponible" /></SelectTrigger>
                          <SelectContent>
                            {teams.find(t => t.id === transferTeamId)?.members.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            )) || []}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {transferTeamId && (
                      <div className="p-3 bg-rose-50 rounded-lg">
                        <p className="text-sm text-rose-700 font-medium">
                          Se transferirá a: {teams.find(t => t.id === transferTeamId)?.name}
                        </p>
                        <p className="text-xs text-rose-500 mt-1">
                          Miembros: {teams.find(t => t.id === transferTeamId)?.members.join(', ')}
                        </p>
                      </div>
                    )}
                    <Button onClick={handleTransfer} className="w-full bg-rose-600 hover:bg-rose-700" disabled={!transferTeamId}>
                      <UserPlus className="w-4 h-4 mr-2" /> Transferir Conversación
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {selectedConv.messages.map((msg) => {
              const isUser = msg.sender === 'user'
              const isBot = msg.isBot
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {!isUser && (
                        <span className="flex items-center gap-1">
                          {isBot ? <Bot className="w-3 h-3 text-emerald-500" /> : <HeadphonesIcon className="w-3 h-3 text-blue-500" />}
                          <span className="text-[10px] text-slate-500 font-medium">{isBot ? 'Bot' : 'Agente'}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isUser
                        ? 'bg-emerald-500 text-white rounded-br-md'
                        : isBot
                          ? 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                          : 'bg-blue-500 text-white rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.type === 'buttons' && msg.buttons && !isUser && (
                      <div className="mt-2 space-y-1.5">
                        {msg.buttons.map(btn => (
                          <button
                            key={btn.id}
                            className="block w-full text-left px-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.type === 'transfer' && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-500">
                        <UserPlus className="w-3 h-3" /> Transferencia en curso
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Tags display */}
          {selectedConv.tags.length > 0 && (
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <TagIcon className="w-3 h-3 text-slate-400" />
              {selectedConv.tags.map(tag => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color }} className="text-[10px] gap-1 py-0">
                  {tag.name}
                  <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => removeTag(selectedConv.id, tag.id)} />
                </Badge>
              ))}
            </div>
          )}

          {/* Message Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  className="resize-none text-sm pr-10 min-h-[40px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-500 mb-2">Selecciona una conversación</h2>
            <p className="text-sm text-slate-400">Elige una conversación de la lista para ver los mensajes</p>
          </div>
        </div>
      )}

      {/* Side Info Panel */}
      {selectedConv && (
        <div className="w-64 border-l border-slate-200 bg-white p-4 overflow-y-auto hidden lg:block">
          <h3 className="font-semibold text-sm mb-3 text-slate-900">Detalles</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Canal</p>
              <div className="flex items-center gap-2 text-sm">
                <span>{channelIcon(selectedConv.channel)}</span>
                <span className="font-medium">{channelLabel(selectedConv.channel)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Estado</p>
              <Badge className={
                selectedConv.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                selectedConv.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                'bg-slate-100 text-slate-600 hover:bg-slate-100'
              }>
                {selectedConv.status === 'active' ? 'Activa' : selectedConv.status === 'pending' ? 'Pendiente' : 'Cerrada'}
              </Badge>
            </div>

            {selectedConv.assignedTo && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Asignado a</p>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{selectedConv.assignedTo}</span>
                </div>
              </div>
            )}

            {selectedConv.team && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Equipo</p>
                <div className="flex items-center gap-2 text-sm">
                  <HeadphonesIcon className="w-4 h-4 text-slate-400" />
                  <span>{selectedConv.team}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-1">Etiquetas</p>
              <div className="flex flex-wrap gap-1">
                {selectedConv.tags.length > 0 ? selectedConv.tags.map(tag => (
                  <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color }} className="text-[10px]">
                    {tag.name}
                  </Badge>
                )) : (
                  <span className="text-xs text-slate-400">Sin etiquetas</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Notas</p>
              <div className="space-y-2">
                {selectedConv.notes.length > 0 ? selectedConv.notes.map(note => (
                  <div key={note.id} className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-xs text-slate-700">{note.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{note.author} · {formatTime(note.createdAt)}</p>
                  </div>
                )) : (
                  <span className="text-xs text-slate-400">Sin notas</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Inicio</p>
              <p className="text-xs text-slate-700">{new Date(selectedConv.createdAt).toLocaleString('es-ES')}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Última actividad</p>
              <p className="text-xs text-slate-700">{new Date(selectedConv.updatedAt).toLocaleString('es-ES')}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Total mensajes</p>
              <p className="text-xs text-slate-700">{selectedConv.messages.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
