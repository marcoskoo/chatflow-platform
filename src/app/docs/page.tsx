'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Scalar API Reference React wrapper loads only on client
const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((m) => m.ApiReferenceReact),
  {
    ssr: false,
    loading: () => <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Cargando documentación…</div>,
  }
)

export default function DocsPage() {
  const [spec, setSpec] = useState<object | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/docs/json')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar la spec')
        return r.json()
      })
      .then((data) => setSpec(data))
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <a href="/">Volver al inicio</a>
      </div>
    )
  }

  if (!spec) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Cargando…</div>
  }

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ApiReferenceReact
        configuration={{
          spec: { content: spec as any },
          theme: 'purple',
          layout: 'modern',
          darkMode: true,
          showSidebar: true,
          hideModels: false,
          hideDownloadButton: false,
          hideTestRequestButton: false,
          metaData: { title: 'ChatFlow API Docs' },
        }}
      />
    </div>
  )
}
