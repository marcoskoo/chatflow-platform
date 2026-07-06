'use client'

import React, { useEffect, useState } from 'react'
import { useChatbotStore } from '@/lib/store'
import { api, getApiKey, type AuthUser } from '@/lib/api-client'
import { Button, Input, Card, CardContent } from '@/components/chatbot/ui'
import {
  Zap, Mail, Lock, User, AlertCircle, Loader2, LogIn, UserPlus, LogOut, Key,
} from 'lucide-react'

/**
 * AuthGate
 *
 * Replaces the old API-key-only BootstrapGate with a proper email/password login.
 *
 * Flow:
 * 1. On mount, try /api/auth/me (uses the session cookie). If it returns a user → ready.
 * 2. If not, fall back to checking for a stored API key in localStorage.
 *    If the key works (api.listBots succeeds) → ready (legacy API-key mode).
 * 3. If neither works → show login screen.
 *
 * Login screen has two tabs:
 *   - "Iniciar Sesión" — email + password, calls /api/auth/login (sets cookie)
 *   - "Crear Cuenta"  — name + email + password, calls /api/auth/register
 *
 * If zero users exist in the DB, the screen offers a one-click "Crear admin inicial"
 * button that calls /api/auth/seed.
 *
 * Legacy fallback: a small "Usar API Key" link at the bottom switches to the old
 * API-key paste form for backwards compatibility (e.g. external integrations).
 */
export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [seedInfo, setSeedInfo] = useState<{ hasUsers: boolean } | null>(null)

  const { setApiKeyAndPersist, refreshAll, setCurrentUser, setAuthMode } = useChatbotStore()

  // On mount: check session cookie first, then API key
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1. Try session cookie
        try {
          const user = await api.authMe()
          if (cancelled) return
          setCurrentUser(user)
          setAuthMode('session')
          await refreshAll()
          if (!cancelled) setReady(true)
          return
        } catch {
          // No valid session — fall through
        }
        // 2. Try stored API key (legacy)
        const existingKey = getApiKey()
        if (existingKey) {
          try {
            await api.listBots()
            if (cancelled) return
            setAuthMode('apikey')
            await refreshAll()
            if (!cancelled) setReady(true)
            return
          } catch {
            setApiKeyAndPersist(null)
          }
        }
        // 3. Show login screen — but first check if seed is needed
        try {
          const seed = await api.authSeedStatus()
          if (cancelled) return
          setSeedInfo({ hasUsers: seed.hasUsers })
        } catch {
          if (cancelled) return
          setSeedInfo({ hasUsers: true })  // assume true; don't offer seed button
        }
        if (!cancelled) setShowLogin(true)
      } catch {
        if (!cancelled) setShowLogin(true)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [setApiKeyAndPersist, refreshAll, setCurrentUser, setAuthMode])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Cargando ChatFlow…</p>
        </div>
      </div>
    )
  }

  if (ready) return <>{children}</>

  if (showLogin) {
    return (
      <LoginScreen
        seedInfo={seedInfo}
        setSeedInfo={setSeedInfo}
        onSuccess={async (user, mode) => {
          setCurrentUser(mode === 'session' ? user : null)
          setAuthMode(mode)
          await refreshAll()
          setReady(true)
        }}
        onLegacyApiKey={async (key) => {
          setApiKeyAndPersist(key)
          setAuthMode('apikey')
          await refreshAll()
          setReady(true)
        }}
      />
    )
  }

  return <>{children}</>
}

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({
  seedInfo, setSeedInfo, onSuccess, onLegacyApiKey,
}: {
  seedInfo: { hasUsers: boolean } | null
  setSeedInfo: (info: { hasUsers: boolean } | null) => void
  onSuccess: (user: AuthUser | null, mode: 'session' | 'apikey') => Promise<void>
  onLegacyApiKey: (key: string) => Promise<void>
}) {
  const [tab, setTab] = useState<'login' | 'register' | 'apikey'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [seedCreated, setSeedCreated] = useState<{ email: string; password: string } | null>(null)

  const handleLogin = async () => {
    setBusy(true); setError(null)
    try {
      const user = await api.authLogin({ email: email.trim(), password })
      setSuccess('Bienvenido. Cargando…')
      await onSuccess(user, 'session')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async () => {
    setBusy(true); setError(null)
    try {
      const user = await api.authRegister({ email: email.trim(), password, name: name.trim() })
      if (user.isFirstUser) {
        // Auto-login as the first user (cookie was set by the server)
        setSuccess('Cuenta creada. Cargando…')
        await onSuccess(user, 'session')
      } else {
        setSuccess('Cuenta creada. Ahora puedes iniciar sesión.')
        setTab('login')
        setName('')
        setPassword('')
        setSeedInfo({ hasUsers: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la cuenta')
    } finally {
      setBusy(false)
    }
  }

  const handleSeed = async () => {
    setBusy(true); setError(null)
    try {
      const result = await api.authSeed()
      if (result.created && result.data) {
        setSeedCreated({ email: result.data.email, password: result.data.password })
        setSeedInfo({ hasUsers: true })
        setEmail(result.data.email)
        setPassword(result.data.password)
        setTab('login')
        setSuccess('Usuario admin inicial creado. Revisa las credenciales abajo e inicia sesión.')
      } else {
        setSuccess(result.message || 'Ya existen usuarios.')
        setSeedInfo({ hasUsers: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear admin inicial')
    } finally {
      setBusy(false)
    }
  }

  const handleLegacyKey = async () => {
    setBusy(true); setError(null)
    try {
      await onLegacyApiKey(apiKeyInput.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API key inválida')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ChatFlow Platform</h1>
              <p className="text-xs text-slate-500">Inicia sesión para continuar</p>
            </div>
          </div>

          {/* Seed banner (only if zero users exist) */}
          {seedInfo && !seedInfo.hasUsers && tab !== 'apikey' && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 mb-2">
                No hay usuarios registrados todavía. Crea el usuario administrador inicial con un solo clic:
              </p>
              <Button
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={busy}
                onClick={handleSeed}
              >
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Crear admin inicial (admin@chatflow.pe / admin123)
              </Button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${tab === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
            >
              <LogIn className="w-4 h-4 inline mr-1" /> Iniciar Sesión
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${tab === 'register' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
            >
              <UserPlus className="w-4 h-4 inline mr-1" /> Crear Cuenta
            </button>
          </div>

          {/* Form: Login */}
          {tab === 'login' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !email || !password}
                onClick={handleLogin}
              >
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                Iniciar Sesión
              </Button>
            </div>
          )}

          {/* Form: Register */}
          {tab === 'register' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Contraseña (mín. 6 caracteres)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !email || !password || !name || password.length < 6}
                onClick={handleRegister}
              >
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Crear Cuenta
              </Button>
            </div>
          )}

          {/* Error / Success messages */}
          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-700">{success}</p>
            </div>
          )}

          {/* Seed credentials display */}
          {seedCreated && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">Credenciales admin</p>
              <p className="text-xs text-slate-700">Email: <code className="bg-white px-1.5 py-0.5 rounded border">{seedCreated.email}</code></p>
              <p className="text-xs text-slate-700 mt-1">Contraseña: <code className="bg-white px-1.5 py-0.5 rounded border">{seedCreated.password}</code></p>
              <p className="text-[10px] text-amber-600 mt-2">⚠️ Cámbiala después de iniciar sesión.</p>
            </div>
          )}

          {/* Legacy API key fallback */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => { setTab(tab === 'apikey' ? 'login' : 'apikey'); setError(null); setSuccess(null) }}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              {tab === 'apikey' ? 'Volver al login con email' : 'Acceso con API Key (avanzado)'}
            </button>
            {tab === 'apikey' && (
              <div className="mt-3 space-y-2">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="cf_xxxxxxxxxxxx..."
                  onKeyDown={(e) => e.key === 'Enter' && apiKeyInput && handleLegacyKey()}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy || !apiKeyInput}
                  onClick={handleLegacyKey}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                  Validar y Continuar
                </Button>
                <p className="text-[10px] text-slate-400">
                  La API Key se usa para integraciones externas (webhooks, scripts). Para uso normal, prefiere iniciar sesión con email y contraseña.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
