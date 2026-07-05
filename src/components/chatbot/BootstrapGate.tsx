'use client'

import React, { useEffect, useState } from 'react'
import { useChatbotStore } from '@/lib/store'
import { api, getApiKey } from '@/lib/api-client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Button, Input, Card, CardContent,
} from '@/components/chatbot/ui'
import {
  Zap, Key, Shield, AlertCircle, Check, Loader2, RefreshCw,
} from 'lucide-react'

/**
 * Wraps the app to handle initial setup state.
 *
 * - If no API key is in localStorage → show the Setup dialog
 * - User can either:
 *   a) Click "Run Setup" → calls POST /api/setup which creates admin key + seed data
 *   b) Paste an existing admin API key → validates and stores
 * - After either path, the rest of the app loads normally
 */
export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showSetup, setShowSetup] = useState(false)

  const { apiKey, setApiKeyAndPersist, refreshAll } = useChatbotStore()

  // On mount: check if setup has been run, and if we already have a key
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const existingKey = getApiKey()
        if (existingKey) {
          // Try a quick API call to verify the key is valid
          try {
            await api.listBots()
            if (!cancelled) {
              setReady(true)
              setChecking(false)
            }
            return
          } catch {
            // Key invalid — fall through to setup dialog
            setApiKeyAndPersist(null)
          }
        }
        // Check if setup has been run server-side
        const res = await fetch('/api/setup')
        const data = await res.json()
        if (cancelled) return
        if (data?.data?.isSetup) {
          // Setup done but no key locally → ask user to paste key
          setShowSetup(true)
        } else {
          // Fresh install → run setup automatically on user click
          setShowSetup(true)
        }
      } catch {
        if (!cancelled) setShowSetup(true)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [setApiKeyAndPersist])

  // When apiKey changes (e.g. after setup), load all data and dismiss dialog
  useEffect(() => {
    if (apiKey && !ready) {
      refreshAll().finally(() => setReady(true))
    }
  }, [apiKey, ready, refreshAll])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando ChatFlow…</p>
        </div>
      </div>
    )
  }

  if (!ready || showSetup) {
    return <SetupDialog
      onDone={() => {
        setShowSetup(false)
        setReady(true)
      }}
    />
  }

  return <>{children}</>
}

function SetupDialog({ onDone }: { onDone: () => void }) {
  const { setApiKeyAndPersist, refreshAll } = useChatbotStore()
  const [tab, setTab] = useState<'auto' | 'paste'>('auto')
  const [pastedKey, setPastedKey] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleAutoSetup = async () => {
    setRunning(true); setError(null); setSuccessMsg(null)
    try {
      const res = await fetch('/api/setup', { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Setup failed')
      if (data.data.apiKey) {
        setApiKeyAndPersist(data.data.apiKey)
        setSuccessMsg(`Setup completado. Se crearon ${data.data.seeded.bots} bots demo, ${data.data.seeded.teams} equipos y ${data.data.seeded.channels} canales.`)
        await refreshAll()
        setTimeout(onDone, 1500)
      } else {
        // Setup was already run before but no key was returned — user must paste it
        setTab('paste')
        setError('El setup ya fue ejecutado previamente. Pega tu API key admin manualmente.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRunning(false)
    }
  }

  const handlePasteKey = async () => {
    setRunning(true); setError(null)
    try {
      setApiKeyAndPersist(pastedKey.trim())
      // Validate
      await api.listBots()
      await refreshAll()
      setSuccessMsg('API key válida. Cargando datos…')
      setTimeout(onDone, 800)
    } catch (e) {
      setApiKeyAndPersist(null)
      setError('API key inválida o sin permisos admin. Verifica e inténtalo de nuevo.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ChatFlow Platform</h1>
              <p className="text-xs text-slate-500">Configuración inicial</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setTab('auto')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${tab === 'auto' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
            >
              <Shield className="w-4 h-4 inline mr-1" /> Auto Setup
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${tab === 'paste' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
            >
              <Key className="w-4 h-4 inline mr-1" /> Pegar API Key
            </button>
          </div>

          {tab === 'auto' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Ejecutaremos la configuración inicial que crea:
              </p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>1 API key admin (se guardará automáticamente)</li>
                <li>3 equipos (Soporte, Ventas, Técnico)</li>
                <li>4 canales (WhatsApp, Messenger, Instagram, Telegram)</li>
                <li>4 bots demo con flujos complejos (8-10 nodos cada uno)</li>
                <li>4 configuraciones webhook (pendientes de credenciales)</li>
              </ul>
              <Button
                onClick={handleAutoSetup}
                disabled={running}
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {running ? 'Configurando…' : 'Ejecutar Setup Automático'}
              </Button>
            </div>
          )}

          {tab === 'paste' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Si ya tienes una API key admin (por ejemplo, de un deploy anterior), pégala aquí:
              </p>
              <Input
                value={pastedKey}
                onChange={(e) => setPastedKey(e.target.value)}
                placeholder="cf_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
              />
              <Button
                onClick={handlePasteKey}
                disabled={running || !pastedKey.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Validar y Continuar
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">{successMsg}</p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-4 text-center">
            La API key se guarda solo en tu navegador (localStorage) y se envía como <code className="bg-slate-100 px-1 rounded">x-api-key</code> en cada petición.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
