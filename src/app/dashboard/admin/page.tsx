import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import DashboardNav from '@/components/DashboardNav'
import AdminPanel from '@/components/AdminPanel'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const rol = (session.user as any)?.rol
  if (!['admin', 'supervisor'].includes(rol)) redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#0017EC', letterSpacing: '-0.02em' }}>
              Administración de usuarios
            </h1>
            <p style={{ color: '#5a5a8a', marginTop: '0.25rem' }}>
              Gestión del equipo — roles, sedes y accesos
            </p>
          </div>
          <Link href="/dashboard/admin/upload" style={{
            background: '#CDFF4F',
            color: '#0017EC',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            📤 Importar CSV
          </Link>
        </div>
        <AdminPanel currentUserRol={rol} />
      </main>
    </div>
  )
}
