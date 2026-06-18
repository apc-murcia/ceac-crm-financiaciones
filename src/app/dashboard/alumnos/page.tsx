import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { Alumno, EstadoAlumno, Sede } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

const ESTADOS: { value: EstadoAlumno | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente_llamar', label: 'Pendiente llamar' },
  { value: 'no_localizable', label: 'No localizable' },
  { value: 'llamado', label: 'Llamado' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'en_proceso_sabadell', label: 'En proceso Sabadell' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'rechazado_banco', label: 'Rechazado banco' },
  { value: 'rechazado_alumno', label: 'Rechazado alumno' },
]

const SEDES: { value: Sede | ''; label: string }[] = [
  { value: '', label: 'Todas las sedes' },
  { value: 'Madrid', label: 'Madrid' },
  { value: 'Barcelona', label: 'Barcelona' },
  { value: 'Valencia', label: 'Valencia' },
]

const ESTADO_LABELS: Record<EstadoAlumno, string> = {
  pendiente_llamar: 'Pendiente llamar',
  no_localizable: 'No localizable',
  llamado: 'Llamado',
  interesado: 'Interesado',
  en_proceso_sabadell: 'En proceso Sabadell',
  convertido: 'Convertido',
  rechazado_banco: 'Rechazado banco',
  rechazado_alumno: 'Rechazado alumno',
}

const ESTADO_COLORS: Record<EstadoAlumno, { bg: string; text: string }> = {
  pendiente_llamar: { bg: '#e0e7ff', text: '#3730a3' },
  no_localizable: { bg: '#fef3c7', text: '#92400e' },
  llamado: { bg: '#dbeafe', text: '#1d4ed8' },
  interesado: { bg: '#d1fae5', text: '#065f46' },
  en_proceso_sabadell: { bg: '#ede9fe', text: '#5b21b6' },
  convertido: { bg: '#bbf7d0', text: '#14532d' },
  rechazado_banco: { bg: '#fee2e2', text: '#991b1b' },
  rechazado_alumno: { bg: '#fce7f3', text: '#9d174d' },
}

const PAGE_SIZE = 50

interface PageProps {
  searchParams: {
    estado?: string
    sede?: string
    search?: string
    page?: string
  }
}

async function getAlumnos(filters: {
  estado?: string
  sede?: string
  search?: string
  page: number
}) {
  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (filters.estado) {
    conditions.push(`a.estado = $${idx++}`)
    params.push(filters.estado)
  }
  if (filters.sede) {
    conditions.push(`a.sede = $${idx++}`)
    params.push(filters.sede)
  }
  if (filters.search) {
    conditions.push(
      `(a.nombre ILIKE $${idx} OR a.apellidos ILIKE $${idx} OR a.email ILIKE $${idx} OR a.telefono ILIKE $${idx} OR a.sf_opportunity_id ILIKE $${idx})`
    )
    params.push(`%${filters.search}%`)
    idx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (filters.page - 1) * PAGE_SIZE

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM alumnos a ${where}`, params),
    pool.query(
      `SELECT a.*, u.nombre AS agente_nombre
       FROM alumnos a
       LEFT JOIN usuarios u ON u.id = a.asignado_a
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, PAGE_SIZE, offset]
    ),
  ])

  return {
    alumnos: dataResult.rows as Alumno[],
    total: Number(countResult.rows[0].count),
  }
}

function formatEuro(value: number | null) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

export default async function AlumnosPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const page = Math.max(1, Number(searchParams.page || 1))
  const { alumnos, total } = await getAlumnos({
    estado: searchParams.estado || '',
    sede: searchParams.sede || '',
    search: searchParams.search || '',
    page,
  })

  const pages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (searchParams.estado) params.set('estado', searchParams.estado)
    if (searchParams.sede) params.set('sede', searchParams.sede)
    if (searchParams.search) params.set('search', searchParams.search)
    params.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    return `/dashboard/alumnos?${params.toString()}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Alumnos</h1>
            <p style={{ color: '#6b7280', marginTop: '0.2rem', fontSize: '0.875rem' }}>
              {total.toLocaleString('es-ES')} alumnos
              {searchParams.estado || searchParams.sede || searchParams.search ? ' (filtrado)' : ' en total'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <form method="GET" style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>Estado</label>
            <select
              name="estado"
              defaultValue={searchParams.estado || ''}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', minWidth: '200px' }}
            >
              {ESTADOS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>Sede</label>
            <select
              name="sede"
              defaultValue={searchParams.sede || ''}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
            >
              {SEDES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>Buscar</label>
            <input
              name="search"
              type="search"
              defaultValue={searchParams.search || ''}
              placeholder="Nombre, email, teléfono..."
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
          </div>

          <button type="submit" style={{
            background: '#005eb8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.55rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}>
            Filtrar
          </button>

          {(searchParams.estado || searchParams.sede || searchParams.search) && (
            <a href="/dashboard/alumnos" style={{
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              Limpiar
            </a>
          )}
        </form>

        {/* Tabla */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Alumno', 'Sede', 'Curso', 'Estado', 'Financiado', 'Oferta', 'DocMgr', 'Agente', 'Último contacto'].map((h) => (
                    <th key={h} style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      whiteSpace: 'nowrap',
                      fontSize: '0.8125rem',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnos.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                      No se encontraron alumnos con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  alumnos.map((alumno) => {
                    const estadoColors = ESTADO_COLORS[alumno.estado] || { bg: '#f3f4f6', text: '#374151' }
                    const docColor = alumno.doc_mgr_status === 'Green' ? '#16a34a'
                      : alumno.doc_mgr_status === 'Red' ? '#dc2626'
                      : alumno.doc_mgr_status === 'Yellow' ? '#ca8a04'
                      : alumno.doc_mgr_status === 'Orange' ? '#ea580c'
                      : alumno.doc_mgr_status === 'Blue' ? '#2563eb'
                      : '#9ca3af'

                    return (
                      <tr
                        key={alumno.id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <Link
                            href={`/dashboard/alumnos/${alumno.id}`}
                            style={{ fontWeight: 500, color: '#005eb8' }}
                          >
                            {alumno.nombre} {alumno.apellidos || ''}
                          </Link>
                          {alumno.telefono && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{alumno.telefono}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                          {alumno.sede || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#374151', maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {alumno.curso || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: estadoColors.bg,
                            color: estadoColors.text,
                            whiteSpace: 'nowrap',
                          }}>
                            {ESTADO_LABELS[alumno.estado] || alumno.estado}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 500 }}>
                          {formatEuro(alumno.importe_financiado)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          {formatEuro(alumno.importe_oferta)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {alumno.doc_mgr_status ? (
                            <span style={{ color: docColor, fontWeight: 700, fontSize: '0.8125rem' }}>
                              {alumno.doc_mgr_status}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                          {alumno.agente_nombre || <span style={{ color: '#9ca3af' }}>Sin asignar</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#6b7280', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                          {alumno.fecha_ultimo_contacto
                            ? new Date(alumno.fecha_ultimo_contacto).toLocaleDateString('es-ES')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1.25rem',
          }}>
            {page > 1 && (
              <a
                href={buildUrl({ page: String(page - 1) })}
                style={{ padding: '0.4rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', color: '#374151' }}
              >
                Anterior
              </a>
            )}
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Página {page} de {pages}
            </span>
            {page < pages && (
              <a
                href={buildUrl({ page: String(page + 1) })}
                style={{ padding: '0.4rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', color: '#374151' }}
              >
                Siguiente
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
