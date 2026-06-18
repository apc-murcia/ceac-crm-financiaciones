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
    if (result?.error) setError('Email o contraseña incorrectos')
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0017EC',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        padding: '2.5rem 2.25rem',
        width: '100%',
        maxWidth: '400px',
      }}>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block',
            background: '#0017EC',
            color: '#CDFF4F',
            fontWeight: 900,
            fontSize: '1.75rem',
            padding: '0.5rem 1.5rem',
            borderRadius: '10px',
            letterSpacing: '0.1em',
            marginBottom: '1rem',
          }}>
            CEAC
          </div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0017EC', margin: '0 0 0.25rem' }}>
            CRM Financiaciones
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#5a5a8a' }}>
            Accede con tu cuenta corporativa
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0017EC' }}>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@ceac.es"
              required
              autoComplete="email"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0017EC' }}>Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Accediendo…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
