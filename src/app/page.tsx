'use client'

import React from 'react'
import { useChatbotStore } from '@/lib/store'
import { Sidebar } from '@/components/chatbot/Sidebar'
import { Dashboard } from '@/components/chatbot/Dashboard'
import { BotList } from '@/components/chatbot/BotList'
import { FlowBuilder } from '@/components/chatbot/FlowBuilder'
import { ConversationPanel } from '@/components/chatbot/ConversationPanel'
import { ChannelManager } from '@/components/chatbot/ChannelManager'
import { TeamManager } from '@/components/chatbot/TeamManager'
import { ApiDocs } from '@/components/chatbot/ApiDocs'

export default function Home() {
  const { currentView } = useChatbotStore()

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
      case 'api':
        return <ApiDocs />
      default:
        return <Dashboard />
    }
  }

  const isFullWidth = currentView === 'builder' || currentView === 'conversations'

  if (isFullWidth) {
    return (
      <div className="flex h-screen bg-white">
        <Sidebar />
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  )
}
