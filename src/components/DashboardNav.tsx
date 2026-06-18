'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardNav() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const rol = (session?.user as any)?.rol
  const navLinks = [
    { href: '/dashboard', label: 'Resumen' },
    { href: '/dashboard/alumnos', label: 'Alumnos' },
    ...((['admin', 'supervisor'].includes(rol)) ? [{ href: '/dashboard/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav style={{
      background: '#0017EC',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      height: '58px',
      gap: '2rem',
      boxShadow: '0 2px 12px rgba(0,23,236,0.25)',
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        fontWeight: 800,
        fontSize: '1rem',
        letterSpacing: '0.08em',
        color: '#CDFF4F',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}>
        CEAC · Financiaciones
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
                color: active ? '#CDFF4F' : 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(205,255,79,0.12)' : 'transparent',
                borderBottom: active ? '2px solid #CDFF4F' : '2px solid transparent',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', whiteSpace: 'nowrap' }}>
        {session?.user && (
          <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)' }}>
            {session.user.name}
            <span style={{ marginLeft: '0.4rem', background: 'rgba(205,255,79,0.2)', color: '#CDFF4F', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>
              {(session.user as any).rol}
            </span>
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            background: '#CDFF4F',
            color: '#0017EC',
            border: 'none',
            borderRadius: '6px',
            padding: '0.375rem 0.875rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Salir
        </button>
      </div>
    </nav>
  )
}
