'use client'

import React from 'react'
import {
  MessageSquare, Bot, Settings, Users, Radio,
  LayoutDashboard, Zap, ChevronLeft, ChevronRight, Code,
} from 'lucide-react'
import { useChatbotStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bots' as const, label: 'Chatbots', icon: Bot },
  { id: 'builder' as const, label: 'Constructor', icon: Zap },
  { id: 'conversations' as const, label: 'Conversaciones', icon: MessageSquare },
  { id: 'channels' as const, label: 'Canales', icon: Radio },
  { id: 'teams' as const, label: 'Equipos', icon: Users },
  { id: 'api' as const, label: 'API & IA', icon: Code },
]

export function Sidebar() {
  const { currentView, setCurrentView, conversations } = useChatbotStore()
  const [collapsed, setCollapsed] = React.useState(false)
  const unreadCount = conversations.reduce((acc, c) => acc + c.unread, 0)

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 border-r border-slate-800',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-lg leading-tight">ChatFlow</h1>
            <p className="text-[10px] text-slate-400 leading-tight">AI Automation</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'conversations' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Colapsar</span>}
        </button>
      </div>
    </aside>
  )
}
