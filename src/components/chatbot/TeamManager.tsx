'use client'

import React, { useState } from 'react'
import { useChatbotStore, type Team } from '@/lib/store'
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/chatbot/ui'
import { Users, Plus, Trash2, Edit3, User, Shield, HeadphonesIcon, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export function TeamManager() {
  const { teams, addTeam, updateTeam, deleteTeam } = useChatbotStore()
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#10b981')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editMemberInput, setEditMemberInput] = useState('')

  const teamColors = ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return
    const team: Team = {
      id: uuidv4(),
      name: newTeamName.trim(),
      description: newTeamDesc.trim() || undefined,
      members: [],
      color: newTeamColor,
    }
    addTeam(team)
    setNewTeamName('')
    setNewTeamDesc('')
    setShowNewTeam(false)
  }

  const handleAddMember = (teamId: string) => {
    if (!editMemberInput.trim()) return
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    updateTeam(teamId, { members: [...team.members, editMemberInput.trim()] })
    setEditMemberInput('')
  }

  const handleRemoveMember = (teamId: string, member: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    updateTeam(teamId, { members: team.members.filter(m => m !== member) })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipos</h1>
          <p className="text-slate-500 mt-1">Gestiona tus equipos para transferencia de conversaciones</p>
        </div>
        <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Nuevo Equipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Equipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre del equipo</label>
                <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ej: Soporte Premium" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Descripción</label>
                <Input value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="Función del equipo" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Color</label>
                <div className="flex gap-2">
                  {teamColors.map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full transition-all ${newTeamColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTeamColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateTeam} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!newTeamName.trim()}>
                Crear Equipo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: team.color }}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    {team.description && <p className="text-xs text-slate-500">{team.description}</p>}
                  </div>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => deleteTeam(team.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Miembros ({team.members.length})</p>
                <div className="space-y-1.5">
                  {team.members.map((member) => (
                    <div key={member} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                          {member.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm text-slate-700">{member}</span>
                      </div>
                      <button
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => handleRemoveMember(team.id, member)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {team.members.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Sin miembros aún</p>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5">
                <Input
                  value={editingTeamId === team.id ? editMemberInput : ''}
                  onChange={(e) => { setEditingTeamId(team.id); setEditMemberInput(e.target.value) }}
                  placeholder="Agregar miembro..."
                  className="text-xs h-8 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMember(team.id)
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => handleAddMember(team.id)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <HeadphonesIcon className="w-3 h-3" /> Disponible para transferencia
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
