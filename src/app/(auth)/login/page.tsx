'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) setError('Usuario o contraseña incorrectos')
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0017EC',
      padding: '1rem',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Logo */}
      <div style={{
        color: '#fff',
        fontWeight: 900,
        fontSize: '3.5rem',
        letterSpacing: '-0.02em',
        marginBottom: '0.5rem',
        lineHeight: 1,
      }}>
        CEAC
      </div>

      {/* Título */}
      <div style={{
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.125rem',
        marginBottom: '0.75rem',
        letterSpacing: '0.01em',
      }}>
        CRM de <em style={{ fontStyle: 'italic' }}>Financiaciones</em>
      </div>

      {/* Pill badge */}
      <div style={{
        background: '#CDFF4F',
        color: '#0017EC',
        fontWeight: 800,
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '0.3rem 1rem',
        borderRadius: '999px',
        marginBottom: '2rem',
      }}>
        Gestión de Financiaciones
      </div>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '2rem 2.25rem',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Usuario
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@ceac.es"
              required
              autoComplete="email"
              style={{
                padding: '0.65rem 0.875rem',
                border: 'none',
                borderRadius: '8px',
                background: '#f0f0fb',
                fontSize: '0.9375rem',
                color: '#0a0a2e',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                padding: '0.65rem 0.875rem',
                border: 'none',
                borderRadius: '8px',
                background: '#f0f0fb',
                fontSize: '0.9375rem',
                color: '#0a0a2e',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0017EC',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.8rem',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '0.25rem',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Accediendo…' : 'Acceder'}
          </button>
        </form>
      </div>

      {/* Footer tagline */}
      <div style={{
        marginTop: '2rem',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.8125rem',
        textAlign: 'center',
      }}>
        CEAC FP —{' '}
        <span style={{ color: '#fff' }}>Te formas,{' '}</span>
        <em style={{ color: '#CDFF4F', fontWeight: 700 }}>trabajas</em>
      </div>

      {/* Pill FP Oficial */}
      <div style={{
        marginTop: '0.75rem',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '0.25rem 0.875rem',
        borderRadius: '999px',
      }}>
        FP Oficial
      </div>

    </div>
  )
}
