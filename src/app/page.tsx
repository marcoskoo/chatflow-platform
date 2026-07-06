'use client'

import React, { useEffect } from 'react'
import { useChatbotStore } from '@/lib/store'
import { Sidebar } from '@/components/chatbot/Sidebar'
import { Dashboard } from '@/components/chatbot/Dashboard'
import { BotList } from '@/components/chatbot/BotList'
import { FlowBuilder } from '@/components/chatbot/FlowBuilder'
import { ConversationPanel } from '@/components/chatbot/ConversationPanel'
import { ChannelManager } from '@/components/chatbot/ChannelManager'
import { TeamManager } from '@/components/chatbot/TeamManager'
import { ApiDocs } from '@/components/chatbot/ApiDocs'
import { ApiKeyManager } from '@/components/chatbot/ApiKeyManager'
import { BootstrapGate } from '@/components/chatbot/BootstrapGate'
import {
  ContactsPanel, BroadcastsPanel, AnalyticsPanel, KnowledgePanel,
  IntegrationsPanel, ABTestingPanel, MarketplacePanel, GDPRPanel,
  BillingPanel, VoicePanel, WorkspacesPanel, AuditPanel, UsersPanel,
  RegionalPanel,
} from '@/components/chatbot/FeaturePanels'
import { SubscriptionPanel } from '@/components/chatbot/SubscriptionPanel'
import { Menu, Zap } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

export default function Home() {
  return (
    <BootstrapGate>
      <AppShell />
    </BootstrapGate>
  )
}

function AppShell() {
  const { currentView, setSidebarOpen, apiKey, refreshAll } = useChatbotStore()
  const isMobile = useIsMobile()

  // Whenever the API key changes (or on first load after setup), refresh all data
  useEffect(() => {
    if (apiKey) refreshAll()
  }, [apiKey, refreshAll])

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'bots':
        return <BotList />
      case 'builder':
        return <FlowBuilder />
      case 'conversations':
        return <ConversationPanel />
      case 'channels':
        return <ChannelManager />
      case 'teams':
        return <TeamManager />
      case 'security':
        return <ApiKeyManager />
      case 'api':
        return <ApiDocs />
      // New views
      case 'contacts':
        return <ContactsPanel />
      case 'broadcasts':
        return <BroadcastsPanel />
      case 'analytics':
        return <AnalyticsPanel />
      case 'knowledge':
        return <KnowledgePanel />
      case 'integrations':
        return <IntegrationsPanel />
      case 'ab-testing':
        return <ABTestingPanel />
      case 'marketplace':
        return <MarketplacePanel />
      case 'gdpr':
        return <GDPRPanel />
      case 'billing':
        return <BillingPanel />
      case 'regional':
        return <RegionalPanel />
      case 'subscriptions':
        return <SubscriptionPanel />
      case 'voice':
        return <VoicePanel />
      case 'workspaces':
        return <WorkspacesPanel />
      case 'audit':
        return <AuditPanel />
      case 'users':
        return <UsersPanel />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-900">ChatFlow</span>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
