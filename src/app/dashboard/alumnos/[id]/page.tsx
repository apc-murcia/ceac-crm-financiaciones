'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Alumno, Llamada, EstadoAlumno, ResultadoLlamada } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

const ESTADOS: EstadoAlumno[] = [
  'pendiente_llamar', 'no_localizable', 'llamado', 'interesado',
  'en_proceso_sabadell', 'convertido', 'rechazado_banco', 'rechazado_alumno',
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

const RESULTADOS: ResultadoLlamada[] = ['no_contesta', 'buzon', 'hablo', 'cita_programada']
const RESULTADO_LABELS: Record<ResultadoLlamada, string> = {
  no_contesta: 'No contesta',
  buzon: 'Buzón',
  hablo: 'Habló',
  cita_programada: 'Cita programada',
}

function formatEuro(value: number | null) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AlumnoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [alumno, setAlumno] = useState<Alumno | null>(null)
  const [llamadas, setLlamadas] = useState<Llamada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Formulario nueva llamada
  const [resultado, setResultado] = useState<ResultadoLlamada>('no_contesta')
  const [comentario, setComentario] = useState('')
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoAlumno | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  async function fetchData() {
    try {
      const [alumnoRes, llamadasRes] = await Promise.all([
        fetch(`/api/alumnos/${id}`),
        fetch(`/api/alumnos/${id}/llamadas`),
      ])
      if (!alumnoRes.ok) throw new Error('Alumno no encontrado')
      const alumnoData = await alumnoRes.json()
      const llamadasData = await llamadasRes.json()
      setAlumno(alumnoData.alumno)
      setEstadoNuevo(alumnoData.alumno.estado)
      setLlamadas(llamadasData)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  async function handleLlamada(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')

    try {
      const res = await fetch(`/api/alumnos/${id}/llamadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultado,
          comentario: comentario.trim() || undefined,
          estado_nuevo: estadoNuevo || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al registrar llamada')
      }

      setSubmitMsg('Llamada registrada correctamente')
      setComentario('')
      await fetchData()
    } catch (e: any) {
      setSubmitMsg(`Error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
        <DashboardNav />
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
      </div>
    )
  }

  if (error || !alumno) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
        <DashboardNav />
        <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>{error || 'Alumno no encontrado'}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <Link href="/dashboard/alumnos" style={{ color: '#005eb8' }}>Alumnos</Link>
          {' / '}
          <span>{alumno.nombre} {alumno.apellidos || ''}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Ficha alumno */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {alumno.nombre} {alumno.apellidos || ''}
              </h1>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600,
                  background: '#dbeafe', color: '#1d4ed8',
                }}>
                  {alumno.sede || 'Sin sede'}
                </span>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600,
                  background: '#f3f4f6', color: '#374151',
                }}>
                  {alumno.modalidad || 'Sin modalidad'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  ['Email', alumno.email],
                  ['Teléfono', alumno.telefono],
                  ['Teléfono 2', alumno.telefono2],
                  ['SF Opportunity', alumno.sf_opportunity_id],
                  ['Curso', alumno.curso],
                  ['DocMgr Status', alumno.doc_mgr_status],
                  ['Agente asignado', alumno.agente_nombre],
                  ['Último contacto', formatDate(alumno.fecha_ultimo_contacto)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, marginBottom: '0.1rem' }}>{label}</div>
                    <div style={{ fontWeight: 500, color: value ? '#111827' : '#d1d5db' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Importes */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Importes</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Total recibos', value: alumno.importe_total_recibos, color: '#374151' },
                  { label: 'Reserva pagada', value: alumno.importe_reserva, color: '#374151' },
                  { label: 'Pendiente (Financiado)', value: alumno.importe_financiado, color: '#005eb8' },
                  { label: 'Oferta Sabadell (-150€)', value: alumno.importe_oferta, color: '#16a34a' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{formatEuro(value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial llamadas */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Historial de llamadas ({llamadas.length})
              </h2>
              {llamadas.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Sin llamadas registradas</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {llamadas.map((llamada) => (
                    <div key={llamada.id} style={{
                      padding: '0.875rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      borderLeft: '3px solid #005eb8',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {RESULTADO_LABELS[llamada.resultado as ResultadoLlamada] || llamada.resultado}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(llamada.fecha)}</span>
                      </div>
                      {llamada.comentario && (
                        <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0' }}>{llamada.comentario}</p>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {llamada.usuario_nombre || 'Agente'} —{' '}
                        {llamada.estado_anterior && llamada.estado_nuevo && llamada.estado_anterior !== llamada.estado_nuevo
                          ? `${ESTADO_LABELS[llamada.estado_anterior as EstadoAlumno]} → ${ESTADO_LABELS[llamada.estado_nuevo as EstadoAlumno]}`
                          : ESTADO_LABELS[llamada.estado_nuevo as EstadoAlumno] || ''
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna lateral: estado + nueva llamada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Estado actual */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Estado actual</h2>
              <span style={{
                display: 'inline-block',
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.875rem',
                background: '#dbeafe',
                color: '#1d4ed8',
              }}>
                {ESTADO_LABELS[alumno.estado] || alumno.estado}
              </span>
              {alumno.ultimo_comentario && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#374151', fontStyle: 'italic' }}>
                  "{alumno.ultimo_comentario}"
                </p>
              )}
            </div>

            {/* Nueva llamada */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Registrar llamada</h2>
              <form onSubmit={handleLlamada} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>
                    Resultado *
                  </label>
                  <select
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value as ResultadoLlamada)}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    {RESULTADOS.map((r) => (
                      <option key={r} value={r}>{RESULTADO_LABELS[r]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>
                    Nuevo estado
                  </label>
                  <select
                    value={estadoNuevo}
                    onChange={(e) => setEstadoNuevo(e.target.value as EstadoAlumno)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>
                    Comentario
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Notas sobre la llamada..."
                    style={{
                      width: '100%', padding: '0.5rem', border: '1px solid #d1d5db',
                      borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.875rem',
                    }}
                  />
                </div>

                {submitMsg && (
                  <div style={{
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: submitMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                    color: submitMsg.startsWith('Error') ? '#dc2626' : '#16a34a',
                    fontSize: '0.8125rem',
                  }}>
                    {submitMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#005eb8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Guardando...' : 'Guardar llamada'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
