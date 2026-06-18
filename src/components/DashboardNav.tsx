'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardNav() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', label: 'Resumen' },
    { href: '/dashboard/alumnos', label: 'Alumnos' },
  ]

  return (
    <nav style={{
      background: '#005eb8',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      height: '56px',
      gap: '2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        fontWeight: 800,
        fontSize: '1.1rem',
        letterSpacing: '1px',
        color: '#fff',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        CEAC CRM
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
        {navLinks.map(({ href, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                color: '#fff',
                textDecoration: 'none',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* User info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', whiteSpace: 'nowrap' }}>
        {session?.user && (
          <span style={{ fontSize: '0.8125rem', opacity: 0.85 }}>
            {session.user.name} — {(session.user as any).rol}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            padding: '0.35rem 0.875rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Salir
        </button>
      </div>
    </nav>
  )
}
