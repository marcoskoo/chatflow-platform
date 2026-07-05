'use client'

import React, { useState, useEffect } from 'react'
import { useChatbotStore, type Team } from '@/lib/store'
import { api } from '@/lib/api-client'
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button, Input,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/chatbot/ui'
import { Users, Plus, Trash2, X, RefreshCw, AlertCircle, HeadphonesIcon } from 'lucide-react'

export function TeamManager() {
  const { teams, refreshTeams, addTeam, updateTeam, deleteTeam, loading } = useChatbotStore()
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#10b981')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editMemberInput, setEditMemberInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { refreshTeams() }, [refreshTeams])

  const teamColors = ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setSaving(true); setError(null)
    try {
      const created = await api.createTeam({
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined,
        members: [],
        color: newTeamColor,
      }) as Team
      addTeam(created)
      setNewTeamName('')
      setNewTeamDesc('')
      setShowNewTeam(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear equipo')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('¿Eliminar este equipo?')) return
    try {
      await api.deleteTeam(id)
      deleteTeam(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar equipo')
    }
  }

  const handleAddMember = async (teamId: string) => {
    if (!editMemberInput.trim()) return
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    const newMembers = [...team.members, editMemberInput.trim()]
    try {
      await api.updateTeam(teamId, { members: newMembers })
      updateTeam(teamId, { members: newMembers })
      setEditMemberInput('')
      setEditingTeamId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar miembro')
    }
  }

  const handleRemoveMember = async (teamId: string, member: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    const newMembers = team.members.filter(m => m !== member)
    try {
      await api.updateTeam(teamId, { members: newMembers })
      updateTeam(teamId, { members: newMembers })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al quitar miembro')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Equipos</h1>
          <p className="text-slate-500 mt-1 text-sm">Gestiona tus equipos para transferencia de conversaciones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshTeams()} disabled={loading.teams}>
            <RefreshCw className={`w-4 h-4 ${loading.teams ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setShowNewTeam(true)}>
            <Plus className="w-4 h-4" /> Nuevo Equipo
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading.teams && teams.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Cargando equipos…</p>
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No tienes equipos configurados</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => setShowNewTeam(true)}>
              <Plus className="w-4 h-4" /> Crear mi primer equipo
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                      {team.description && <p className="text-xs text-slate-500 line-clamp-1">{team.description}</p>}
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => handleDeleteTeam(team.id)}>
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
                            {member.split(' ').map((n) => n[0]).join('')}
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
      )}

      {/* New team dialog */}
      <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
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
            <Button onClick={handleCreateTeam} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!newTeamName.trim() || saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {saving ? 'Creando…' : 'Crear Equipo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
