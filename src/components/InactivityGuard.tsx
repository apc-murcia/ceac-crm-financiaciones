'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'

const TIMEOUT_MS = 5 * 60 * 1000  // 5 minutos
const WARNING_MS = 60 * 1000       // aviso 1 minuto antes

export default function InactivityGuard() {
  const { data: session } = useSession()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function reset() {
    setShowWarning(false)
    setCountdown(60)
    if (countRef.current) clearInterval(countRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)

    warnRef.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(60)
      countRef.current = setInterval(() => {
        setCountdown(c => c - 1)
      }, 1000)
    }, TIMEOUT_MS - WARNING_MS)

    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: `${window.location.origin}/login` })
    }, TIMEOUT_MS)
  }

  useEffect(() => {
    if (!session) return

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnRef.current) clearTimeout(warnRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [session])

  if (!showWarning) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '2rem 2.5rem',
        maxWidth: '380px', width: '90%', textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏱️</div>
        <h2 style={{ color: '#0017EC', fontWeight: 800, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
          Sesión a punto de expirar
        </h2>
        <p style={{ color: '#5a5a8a', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Por inactividad, la sesión se cerrará en{' '}
          <strong style={{ color: '#0017EC' }}>{countdown}s</strong>
        </p>
        <button
          onClick={reset}
          style={{
            background: '#CDFF4F', color: '#0017EC', border: 'none',
            borderRadius: '8px', padding: '0.75rem 2rem',
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer', width: '100%',
          }}
        >
          Seguir conectado
        </button>
        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          style={{
            background: 'none', color: '#9ca3af', border: 'none',
            fontSize: '0.8125rem', cursor: 'pointer', marginTop: '0.75rem',
          }}
        >
          Cerrar sesión ahora
        </button>
      </div>
    </div>
  )
}
