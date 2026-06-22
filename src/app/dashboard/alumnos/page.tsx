import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { Alumno, EstadoAlumno, Sede } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

const ESTADOS: { value: EstadoAlumno | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente_llamar', label: 'Pendiente de contactar' },
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
  pendiente_llamar: 'Pendiente de contactar',
  no_localizable: 'No localizable',
  llamado: 'Llamado',
  interesado: 'Interesado',
  en_proceso_sabadell: 'En proceso Sabadell',
  convertido: 'Convertido',
  rechazado_banco: 'Rechazado banco',
  rechazado_alumno: 'Rechazado alumno',
}

const ESTADO_COLORS: Record<EstadoAlumno, { bg: string; text: string }> = {
  pendiente_llamar:    { bg: '#E5E5FA', text: '#0017EC' },
  no_localizable:      { bg: '#fef3c7', text: '#92400e' },
  llamado:             { bg: '#dbeafe', text: '#1d4ed8' },
  interesado:          { bg: '#E1FF96', text: '#1a4a00' },
  en_proceso_sabadell: { bg: '#ede9fe', text: '#5b21b6' },
  convertido:          { bg: '#bbf7d0', text: '#14532d' },
  rechazado_banco:     { bg: '#fee2e2', text: '#991b1b' },
  rechazado_alumno:    { bg: '#fce7f3', text: '#9d174d' },
}

const PAGE_SIZE = 50

const MODALIDADES: { value: string; label: string }[] = [
  { value: '', label: 'Todas las modalidades' },
  { value: 'Presencial', label: 'Presencial' },
  { value: 'B-Learning', label: 'B-Learning' },
  { value: 'Distancia', label: 'Distancia' },
]

const ESTADO_SF_OPTIONS = [
  { value: '', label: 'Todos (estado SF)' },
  { value: 'Pendiente Matrícula', label: 'Pendiente Matrícula' },
  { value: 'Cerrada ganada', label: 'Cerrada ganada' },
]

interface PageProps {
  searchParams: { estado?: string; sede?: string; modalidad?: string; search?: string; page?: string; pago_cambiado?: string; estado_sf?: string }
}

async function getAlumnos(filters: { estado?: string; sede?: string; modalidad?: string; search?: string; page: number; pago_cambiado?: boolean; estado_sf?: string }) {
  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (filters.estado)    { conditions.push(`a.estado = $${idx++}`);    params.push(filters.estado) }
  if (filters.sede)      { conditions.push(`a.sede = $${idx++}`);      params.push(filters.sede) }
  if (filters.modalidad) { conditions.push(`a.modalidad = $${idx++}`); params.push(filters.modalidad) }
  if (filters.estado_sf) { conditions.push(`a.estado_sf = $${idx++}`); params.push(filters.estado_sf) }
  if (filters.search) {
    conditions.push(`(a.nombre ILIKE $${idx} OR a.apellidos ILIKE $${idx} OR a.email ILIKE $${idx} OR a.telefono ILIKE $${idx})`)
    params.push(`%${filters.search}%`)
    idx++
  }
  if (filters.pago_cambiado) {
    conditions.push(`(a.forma_pago_actual IS NOT NULL AND (
      a.forma_pago_actual IS DISTINCT FROM a.forma_pago_original OR
      a.financiera_actual IS DISTINCT FROM a.financiera_original OR
      a.plazos_actual IS DISTINCT FROM a.plazos_original OR
      a.importe_total_actual IS DISTINCT FROM a.importe_total_original
    ))`)
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

  return { alumnos: dataResult.rows as Alumno[], total: Number(countResult.rows[0].count) }
}

function formatEuro(value: number | null) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

export default async function AlumnosPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const page = Math.max(1, Number(searchParams.page || 1))
  const pagoCambiado = searchParams.pago_cambiado === '1'
  const { alumnos, total } = await getAlumnos({
    estado: searchParams.estado || '',
    sede: searchParams.sede || '',
    search: searchParams.search || '',
    modalidad: searchParams.modalidad || '',
    page,
    pago_cambiado: pagoCambiado,
    estado_sf: searchParams.estado_sf !== undefined ? searchParams.estado_sf : 'Cerrada ganada',
  })
  const pages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (searchParams.estado) params.set('estado', searchParams.estado)
    if (searchParams.sede)   params.set('sede', searchParams.sede)
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.modalidad) params.set('modalidad', searchParams.modalidad)
    if (searchParams.pago_cambiado) params.set('pago_cambiado', searchParams.pago_cambiado)
    if (searchParams.estado_sf) params.set('estado_sf', searchParams.estado_sf)
    params.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k))
    return `/dashboard/alumnos?${params.toString()}`
  }

  const hayFiltros = searchParams.estado || searchParams.sede || searchParams.search || searchParams.pago_cambiado || (searchParams.estado_sf && searchParams.estado_sf !== 'Cerrada ganada')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#0017EC', letterSpacing: '-0.02em' }}>
              Alumnos
            </h1>
            <p style={{ color: '#5a5a8a', marginTop: '0.2rem', fontSize: '0.875rem' }}>
              {total.toLocaleString('es-ES')} alumnos{hayFiltros ? ' (filtrado)' : ' en total'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <form method="GET" style={{
          background: '#fff',
          border: '1.5px solid #E5E5FA',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          boxShadow: '0 1px 4px rgba(0,23,236,0.07)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</label>
            <select name="estado" defaultValue={searchParams.estado || ''} className="input" style={{ minWidth: '200px' }}>
              {ESTADOS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sede</label>
            <select name="sede" defaultValue={searchParams.sede || ''} className="input">
              {SEDES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modalidad</label>
            <select name="modalidad" defaultValue={searchParams.modalidad || ''} className="input">
              {MODALIDADES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado matrícula SF</label>
            <select name="estado_sf" defaultValue={searchParams.estado_sf !== undefined ? searchParams.estado_sf : 'Cerrada ganada'} className="input">
              {ESTADO_SF_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscar</label>
            <input name="search" type="search" defaultValue={searchParams.search || ''} placeholder="Nombre, email, teléfono…" className="input" />
          </div>

          <button type="submit" className="btn btn-primary">Filtrar</button>

          <a
            href={pagoCambiado ? '/dashboard/alumnos' : buildUrl({ pago_cambiado: '1' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.875rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap', alignSelf: 'flex-end',
              background: pagoCambiado ? '#CDFF4F' : '#fff',
              color: pagoCambiado ? '#0a0a2e' : '#0017EC',
              border: `2px solid ${pagoCambiado ? '#CDFF4F' : '#0017EC'}`,
            }}
          >
            ⚡ Pago cambiado{pagoCambiado ? ' ✕' : ''}
          </a>

          {hayFiltros && (
            <a href="/dashboard/alumnos" className="btn btn-outline">Limpiar</a>
          )}
        </form>

        {/* Tabla */}
        <div style={{
          background: '#fff',
          border: '1.5px solid #E5E5FA',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,23,236,0.07)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {['Alumno', 'Sede', 'Curso', 'Forma de pago', 'Estado', 'Financiado', 'Oferta', 'DocMgr', 'Agente', 'Último contacto'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnos.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#5a5a8a' }}>
                      No se encontraron alumnos con los filtros seleccionados
                    </td>
                  </tr>
                ) : alumnos.map(alumno => {
                  const ec = ESTADO_COLORS[alumno.estado] || { bg: '#f3f4f6', text: '#374151' }
                  const docColor = alumno.doc_mgr_status === 'Green' ? '#16a34a'
                    : alumno.doc_mgr_status === 'Red' ? '#F44336'
                    : alumno.doc_mgr_status === 'Yellow' ? '#ca8a04'
                    : alumno.doc_mgr_status === 'Orange' ? '#ea580c'
                    : alumno.doc_mgr_status === 'Blue' ? '#0017EC'
                    : '#9ca3af'

                  const pagoCambio = alumno.forma_pago_actual && (
                    alumno.forma_pago_actual !== alumno.forma_pago_original ||
                    alumno.financiera_actual !== alumno.financiera_original ||
                    alumno.plazos_actual !== alumno.plazos_original ||
                    alumno.importe_total_actual !== alumno.importe_total_original
                  )

                  return (
                    <tr key={alumno.id}>
                      <td>
                        <Link href={`/dashboard/alumnos/${alumno.id}`} style={{ fontWeight: 600, color: '#0017EC' }}>
                          {alumno.nombre} {alumno.apellidos || ''}
                        </Link>
                        {alumno.telefono && (
                          <div style={{ fontSize: '0.75rem', color: '#5a5a8a' }}>{alumno.telefono}</div>
                        )}
                        {pagoCambio && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#CDFF4F', color: '#0a0a2e', borderRadius: '4px', padding: '0.1rem 0.4rem', marginTop: '0.2rem', display: 'inline-block' }}>
                            ⚡ Pago cambiado
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#5a5a8a' }}>{alumno.sede || '—'}</td>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5a5a8a' }}>
                          {alumno.curso || '—'}
                        </div>
                      </td>
                      <td>
                        {alumno.forma_pago_actual ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: pagoCambio ? '#166534' : '#5a5a8a' }}>
                              {alumno.forma_pago_actual}
                            </div>
                            {alumno.financiera_actual && (
                              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{alumno.financiera_actual} · {alumno.plazos_actual}c</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: ec.bg, color: ec.text, whiteSpace: 'nowrap' }}>
                          {ESTADO_LABELS[alumno.estado] || alumno.estado}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatEuro(alumno.importe_financiado)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatEuro(alumno.importe_oferta)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {alumno.doc_mgr_status
                          ? <span style={{ color: docColor, fontWeight: 700, fontSize: '0.8125rem' }}>{alumno.doc_mgr_status}</span>
                          : '—'}
                      </td>
                      <td style={{ color: '#5a5a8a' }}>{alumno.agente_nombre || <span style={{ color: '#9ca3af' }}>Sin asignar</span>}</td>
                      <td style={{ color: '#5a5a8a', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {alumno.fecha_ultimo_contacto
                          ? new Date(alumno.fecha_ultimo_contacto).toLocaleDateString('es-ES')
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
            {page > 1 && (
              <a href={buildUrl({ page: String(page - 1) })} className="btn btn-outline">Anterior</a>
            )}
            <span style={{ fontSize: '0.875rem', color: '#5a5a8a' }}>Página {page} de {pages}</span>
            {page < pages && (
              <a href={buildUrl({ page: String(page + 1) })} className="btn btn-outline">Siguiente</a>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
