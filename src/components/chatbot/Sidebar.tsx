'use client'

import React from 'react'
import {
  MessageSquare, Bot, Settings, Users, Radio,
  LayoutDashboard, Zap, ChevronLeft, X, Code, Shield,
  Contact as ContactIcon, Megaphone, BarChart3, BookOpen, Plug,
  FlaskConical, Store, Lock, CreditCard, Phone, Building2, ScrollText, Star,
  Wallet,
} from 'lucide-react'
import { useChatbotStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

type View = 'dashboard' | 'bots' | 'builder' | 'conversations' | 'channels' | 'teams'
  | 'api' | 'security' | 'contacts' | 'broadcasts' | 'analytics' | 'knowledge'
  | 'integrations' | 'ab-testing' | 'marketplace' | 'gdpr' | 'billing'
  | 'voice' | 'workspaces' | 'audit' | 'users' | 'subscriptions'

interface NavGroup {
  label: string
  items: { id: View; label: string; icon: typeof Bot }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'bots', label: 'Chatbots', icon: Bot },
      { id: 'builder', label: 'Constructor', icon: Zap },
      { id: 'conversations', label: 'Conversaciones', icon: MessageSquare },
      { id: 'contacts', label: 'Contactos CRM', icon: ContactIcon },
      { id: 'broadcasts', label: 'Campañas', icon: Megaphone },
    ],
  },
  {
    label: 'Crecimiento',
    items: [
      { id: 'analytics', label: 'Analítica', icon: BarChart3 },
      { id: 'ab-testing', label: 'Tests A/B', icon: FlaskConical },
      { id: 'marketplace', label: 'Plantillas', icon: Store },
    ],
  },
  {
    label: 'IA y Datos',
    items: [
      { id: 'knowledge', label: 'Base de Conoc.', icon: BookOpen },
      { id: 'integrations', label: 'Integraciones', icon: Plug },
    ],
  },
  {
    label: 'Canales extra',
    items: [
      { id: 'channels', label: 'Canales', icon: Radio },
      { id: 'voice', label: 'Voice Bots', icon: Phone },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'teams', label: 'Equipos', icon: Users },
      { id: 'users', label: 'Usuarios y Roles', icon: Users },
      { id: 'audit', label: 'Audit Logs', icon: ScrollText },
      { id: 'security', label: 'Seguridad', icon: Shield },
      { id: 'gdpr', label: 'GDPR', icon: Lock },
      { id: 'subscriptions', label: 'Suscripciones', icon: Wallet },
      { id: 'billing', label: 'Facturación', icon: CreditCard },
      { id: 'workspaces', label: 'Workspaces', icon: Building2 },
      { id: 'api', label: 'API & IA', icon: Code },
    ],
  },
]

export function Sidebar() {
  const { currentView, setCurrentView, conversations, sidebarOpen, setSidebarOpen } = useChatbotStore()
  const isMobile = useIsMobile()
  const unreadCount = conversations.reduce((acc, c) => acc + c.unread, 0)

  const handleNav = (view: typeof currentView) => {
    setCurrentView(view)
    if (isMobile) setSidebarOpen(false)
  }

  const renderNavGroup = (group: NavGroup, collapsed: boolean) => (
    <div key={group.label} className="mb-2">
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {group.label}
        </div>
      )}
      {group.items.map((item) => {
        const Icon = item.icon
        const isActive = currentView === item.id
        return (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              collapsed && 'justify-center px-0',
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
    </div>
  )

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out flex flex-col',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-bold text-lg leading-tight">ChatFlow</h1>
                <p className="text-[10px] text-slate-400 leading-tight">AI Automation</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-3 px-2 overflow-y-auto">
            {navGroups.map((g) => renderNavGroup(g, false))}
          </nav>
        </aside>
      </>
    )
  }

  // Desktop: collapsible sidebar
  const collapsed = !sidebarOpen
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

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navGroups.map((g) => renderNavGroup(g, collapsed))}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          {collapsed ? <ChevronLeft className="w-4 h-4 rotate-180" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Colapsar</span>}
        </button>
      </div>
    </aside>
  )
}
