'use client'

import React from 'react'
import { useChatbotStore } from '@/lib/store'
import {
  MessageSquare, Bot, Radio, Users, TrendingUp,
  Clock, ArrowUpRight, Zap, BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
  const { bots, conversations, channels, teams, setCurrentView } = useChatbotStore()

  const activeBots = bots.filter(b => b.status === 'active').length
  const activeConvs = conversations.filter(c => c.status === 'active').length
  const connectedChannels = channels.filter(c => c.connected).length
  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0)
  const pendingConvs = conversations.filter(c => c.status === 'pending').length
  const avgResponseTime = '1.2 min'

  const channelStats = [
    { name: 'WhatsApp', count: conversations.filter(c => c.channel === 'whatsapp').length, color: 'bg-green-500', icon: '💬' },
    { name: 'Messenger', count: conversations.filter(c => c.channel === 'messenger').length, color: 'bg-blue-500', icon: '💬' },
    { name: 'Instagram', count: conversations.filter(c => c.channel === 'instagram').length, color: 'bg-pink-500', icon: '📸' },
    { name: 'Telegram', count: conversations.filter(c => c.channel === 'telegram').length, color: 'bg-cyan-500', icon: '✈️' },
  ]

  const stats = [
    { title: 'Bots Activos', value: activeBots, total: bots.length, icon: Bot, color: 'text-emerald-500', bg: 'bg-emerald-50', link: 'bots' as const },
    { title: 'Conversaciones', value: activeConvs, total: conversations.length, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50', link: 'conversations' as const },
    { title: 'Canales Conectados', value: connectedChannels, total: channels.length, icon: Radio, color: 'text-purple-500', bg: 'bg-purple-50', link: 'channels' as const },
    { title: 'Total Mensajes', value: totalMessages, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50', link: 'conversations' as const },
  ]

  const recentConversations = conversations.slice(0, 5)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen de tu plataforma de chatbots con IA</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow cursor-pointer border-slate-200"
              onClick={() => setCurrentView(stat.link)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{stat.title}</p>
                  {stat.total && (
                    <p className="text-xs text-slate-400 mt-1">de {stat.total} total</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Conversaciones por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {channelStats.map((ch) => (
                <div key={ch.name} className="flex items-center gap-3">
                  <span className="text-lg w-8">{ch.icon}</span>
                  <span className="text-sm font-medium text-slate-700 w-24">{ch.name}</span>
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${ch.color} rounded-lg flex items-center px-3 transition-all`}
                      style={{ width: `${Math.max((ch.count / Math.max(conversations.length, 1)) * 100, 8)}%` }}
                    >
                      <span className="text-white text-xs font-bold">{ch.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Métricas Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Tiempo respuesta</p>
                <p className="text-lg font-bold text-amber-700">{avgResponseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-300" />
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Pendientes</p>
                <p className="text-lg font-bold text-red-700">{pendingConvs}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-red-300" />
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Equipos activos</p>
                <p className="text-lg font-bold text-emerald-700">{teams.length}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Conversaciones Recientes</CardTitle>
            <button
              onClick={() => setCurrentView('conversations')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver todas →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentConversations.map((conv) => {
              const channelIcon = conv.channel === 'whatsapp' ? '💬' : conv.channel === 'messenger' ? '💬' : conv.channel === 'instagram' ? '📸' : '✈️'
              const statusColor = conv.status === 'active' ? 'bg-emerald-100 text-emerald-700' : conv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              return (
                <div key={conv.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                    {conv.contactName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{conv.contactName}</span>
                      <span className="text-xs">{channelIcon}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {conv.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {conv.status === 'active' ? 'Activa' : conv.status === 'pending' ? 'Pendiente' : 'Cerrada'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
