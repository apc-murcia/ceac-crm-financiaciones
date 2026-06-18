import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
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
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#0017EC', letterSpacing: '-0.02em' }}>
            Administración de usuarios
          </h1>
          <p style={{ color: '#5a5a8a', marginTop: '0.25rem' }}>
            Gestión del equipo — roles, sedes y accesos
          </p>
        </div>
        <AdminPanel currentUserRol={rol} />
      </main>
    </div>
  )
}
