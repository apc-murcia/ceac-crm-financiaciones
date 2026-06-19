'use client'

import { useState, useRef, DragEvent } from 'react'
import Link from 'next/link'

export default function UploadCSVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) setFile(f)
    else setError('Solo se admiten ficheros .csv')
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/upload-csv', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al procesar'); return }
      setResult(data)
      setFile(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,23,236,0.08)' }}>
        <h2 style={{ color: '#0017EC', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Subir datos</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          Sube el fichero CSV de Salesforce (máx 20MB)
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#0017EC' : '#d0d0e8'}`,
            borderRadius: '12px',
            padding: '2.5rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#f0f0fb' : '#fafafa',
            transition: 'all 0.15s',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
          {file ? (
            <div>
              <div style={{ fontWeight: 600, color: '#0017EC', fontSize: '0.9rem' }}>{file.name}</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                {(file.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', fontSize: '0.875rem' }}>
              Arrastra el CSV aquí o <span style={{ color: '#0017EC', fontWeight: 600 }}>haz clic</span>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); setError(''); setResult(null) }
          }} />
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            ✓ <strong>{file === null ? result.total : result.total} registros procesados</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
              {result.inserted} nuevos · {result.updated} actualizados{result.errors > 0 ? ` · ${result.errors} errores` : ''}
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%',
            background: file && !loading ? '#0017EC' : '#c0c0d8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.875rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: file && !loading ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Procesando…' : result ? 'Subir otro fichero' : 'Subir fichero'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link href="/dashboard/admin" style={{ color: '#888', fontSize: '0.8125rem', textDecoration: 'none' }}>
            ← Volver al panel admin
          </Link>
        </div>
      </div>
    </div>
  )
}
