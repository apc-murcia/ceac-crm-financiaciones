'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Alumno, Llamada, EstadoAlumno, ResultadoLlamada } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

const ESTADOS: EstadoAlumno[] = [
  'pendiente_llamar', 'no_localizable', 'llamado', 'interesado',
  'en_proceso_sabadell', 'convertido', 'rechazado_banco', 'rechazado_alumno',
]
const ESTADO_LABELS: Record<EstadoAlumno, string> = {
  pendiente_llamar: 'Pendiente llamar', no_localizable: 'No localizable',
  llamado: 'Llamado', interesado: 'Interesado',
  en_proceso_sabadell: 'En proceso Sabadell', convertido: 'Convertido',
  rechazado_banco: 'Rechazado banco', rechazado_alumno: 'Rechazado alumno',
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
const RESULTADOS: ResultadoLlamada[] = ['no_contesta', 'buzon', 'hablo', 'cita_programada']
const RESULTADO_LABELS: Record<ResultadoLlamada, string> = {
  no_contesta: 'No contesta', buzon: 'Buzón', hablo: 'Habló', cita_programada: 'Cita programada',
}

function formatEuro(v: number | null) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}
function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

const card = {
  background: '#fff',
  border: '1.5px solid #E5E5FA',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,23,236,0.07)',
} satisfies React.CSSProperties

const labelStyle = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#5a5a8a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: '0.2rem',
}

export default function AlumnoDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [alumno, setAlumno] = useState<Alumno | null>(null)
  const [llamadas, setLlamadas] = useState<Llamada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoLlamada>('no_contesta')
  const [comentario, setComentario] = useState('')
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoAlumno | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [savingObs, setSavingObs] = useState(false)
  const [obsMsg, setObsMsg] = useState('')

  async function fetchData() {
    try {
      const [ar, lr] = await Promise.all([
        fetch(`/api/alumnos/${id}`),
        fetch(`/api/alumnos/${id}/llamadas`),
      ])
      if (!ar.ok) throw new Error('Alumno no encontrado')
      const ad = await ar.json()
      setAlumno(ad.alumno)
      setEstadoNuevo(ad.alumno.estado)
      setObservaciones(ad.alumno.observaciones || '')
      setLlamadas(await lr.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  async function handleObservaciones() {
    setSavingObs(true)
    setObsMsg('')
    try {
      const res = await fetch(`/api/alumnos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setObsMsg('Guardado')
      await fetchData()
    } catch {
      setObsMsg('Error al guardar')
    } finally {
      setSavingObs(false)
      setTimeout(() => setObsMsg(''), 3000)
    }
  }

  async function handleLlamada(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res = await fetch(`/api/alumnos/${id}/llamadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado, comentario: comentario.trim() || undefined, estado_nuevo: estadoNuevo || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error') }
      setSubmitMsg('Llamada registrada')
      setComentario('')
      await fetchData()
    } catch (e: any) {
      setSubmitMsg(`Error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />
      <div style={{ padding: '4rem', textAlign: 'center', color: '#5a5a8a' }}>Cargando…</div>
    </div>
  )

  if (error || !alumno) return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />
      <div style={{ padding: '4rem', textAlign: 'center', color: '#F44336' }}>{error || 'Alumno no encontrado'}</div>
    </div>
  )

  const ec = ESTADO_COLORS[alumno.estado] || { bg: '#E5E5FA', text: '#0017EC' }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: '#5a5a8a' }}>
          <Link href="/dashboard/alumnos" style={{ color: '#0017EC', fontWeight: 600 }}>Alumnos</Link>
          <span style={{ margin: '0 0.5rem' }}>{'/'}</span>
          <span>{alumno.nombre} {alumno.apellidos || ''}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Ficha */}
            <div style={card}>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0017EC', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                {alumno.nombre} {alumno.apellidos || ''}
              </h1>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <span className="badge" style={{ background: '#E5E5FA', color: '#0017EC' }}>{alumno.sede || 'Sin sede'}</span>
                <span className="badge" style={{ background: '#f0f0fb', color: '#5a5a8a' }}>{alumno.modalidad || 'Sin modalidad'}</span>
                <span className="badge" style={{ background: ec.bg, color: ec.text }}>{ESTADO_LABELS[alumno.estado]}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  <div key={label as string}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontWeight: 500, color: value ? '#0a0a2e' : '#d1d5db', fontSize: '0.9375rem' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {alumno.ultimo_comentario && (
                <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: '#f0f0fb', borderRadius: '8px', borderLeft: '3px solid #CDFF4F' }}>
                  <div style={labelStyle}>Último comentario</div>
                  <p style={{ fontSize: '0.9375rem', color: '#0a0a2e', marginTop: '0.25rem' }}>{alumno.ultimo_comentario}</p>
                </div>
              )}
            </div>

            {/* Importes */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Importes
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Total recibos',         value: alumno.importe_total_recibos, color: '#5a5a8a' },
                  { label: 'Reserva pagada',         value: alumno.importe_reserva,       color: '#5a5a8a' },
                  { label: 'Pendiente financiado',   value: alumno.importe_financiado,    color: '#0017EC' },
                  { label: 'Oferta Sabadell (−150€)', value: alumno.importe_oferta,       color: '#16a34a' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '1rem 0.75rem', background: '#f0f0fb', borderRadius: '10px' }}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color, marginTop: '0.25rem' }}>{formatEuro(value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forma de pago */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Forma de pago
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                {/* Original */}
                <div style={{ background: '#f8f8ff', borderRadius: '10px', padding: '1rem', border: '1.5px solid #E5E5FA' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5a5a8a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.875rem' }}>
                    Original (al contratar)
                  </div>
                  {[
                    ['Método', alumno.forma_pago_original],
                    ['Financiera', alumno.financiera_original],
                    ['Plazos', alumno.plazos_original ? `${alumno.plazos_original} cuotas` : null],
                    ['Total', formatEuro(alumno.importe_total_original)],
                    ['Reserva', formatEuro(alumno.importe_reserva_original)],
                    ['Financiado', formatEuro(alumno.importe_financiado_original)],
                  ].map(([label, value]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0', borderBottom: '1px solid #E5E5FA' }}>
                      <span style={{ fontSize: '0.78rem', color: '#5a5a8a' }}>{label}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: value && value !== '—' ? '#0a0a2e' : '#d1d5db' }}>{value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Actual */}
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem', border: '1.5px solid #86efac' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.875rem' }}>
                    Actual (vigente)
                  </div>
                  {[
                    ['Método', alumno.forma_pago_actual],
                    ['Financiera', alumno.financiera_actual],
                    ['Plazos', alumno.plazos_actual ? `${alumno.plazos_actual} cuotas` : null],
                    ['1er pago', alumno.fecha_primer_pago_actual ? new Date(alumno.fecha_primer_pago_actual).toLocaleDateString('es-ES') : null],
                    ['Total', formatEuro(alumno.importe_total_actual)],
                    ['Reserva', formatEuro(alumno.importe_reserva_actual)],
                    ['Financiado', formatEuro(alumno.importe_financiado_actual)],
                  ].map(([label, value]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0', borderBottom: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '0.78rem', color: '#166534' }}>{label}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: value && value !== '—' ? '#14532d' : '#d1d5db' }}>{value || '—'}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Historial */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Historial de llamadas ({llamadas.length})
              </h2>
              {llamadas.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Sin llamadas registradas</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {llamadas.map(ll => (
                    <div key={ll.id} style={{
                      padding: '0.875rem 1rem',
                      background: '#f0f0fb',
                      borderRadius: '8px',
                      borderLeft: '3px solid #0017EC',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0017EC' }}>
                          {RESULTADO_LABELS[ll.resultado as ResultadoLlamada] || ll.resultado}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(ll.fecha)}</span>
                      </div>
                      {ll.comentario && <p style={{ fontSize: '0.875rem', color: '#0a0a2e', margin: '0.25rem 0' }}>{ll.comentario}</p>}
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {ll.usuario_nombre || 'Agente'}
                        {ll.estado_anterior && ll.estado_nuevo && ll.estado_anterior !== ll.estado_nuevo && (
                          <> — {ESTADO_LABELS[ll.estado_anterior as EstadoAlumno]} → {ESTADO_LABELS[ll.estado_nuevo as EstadoAlumno]}</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Estado */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                Estado actual
              </h2>
              <span className="badge" style={{ background: ec.bg, color: ec.text, fontSize: '0.875rem', padding: '0.4rem 1rem' }}>
                {ESTADO_LABELS[alumno.estado]}
              </span>
            </div>

            {/* Observaciones */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                Observaciones
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                Notas internas — no se pierden al reimportar el CSV
              </p>
              <textarea
                className="input"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={5}
                placeholder="Escribe aquí las observaciones sobre este alumno…"
                style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
              {obsMsg && (
                <div style={{ fontSize: '0.8rem', color: obsMsg === 'Guardado' ? '#16a34a' : '#dc2626', marginTop: '0.4rem' }}>
                  {obsMsg === 'Guardado' ? '✓ Guardado' : obsMsg}
                </div>
              )}
              <button
                onClick={handleObservaciones}
                disabled={savingObs}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginTop: '0.75rem' }}
              >
                {savingObs ? 'Guardando…' : 'Guardar observaciones'}
              </button>
            </div>

            {/* Nueva llamada */}
            <div style={card}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0017EC', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Registrar llamada
              </h2>
              <form onSubmit={handleLlamada} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                <div>
                  <label style={labelStyle}>Resultado *</label>
                  <select className="input" value={resultado} onChange={e => setResultado(e.target.value as ResultadoLlamada)} required>
                    {RESULTADOS.map(r => <option key={r} value={r}>{RESULTADO_LABELS[r]}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Nuevo estado</label>
                  <select className="input" value={estadoNuevo} onChange={e => setEstadoNuevo(e.target.value as EstadoAlumno)}>
                    {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Comentario</label>
                  <textarea
                    className="input"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Notas sobre la llamada…"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {submitMsg && (
                  <div className={`alert ${submitMsg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
                    {submitMsg}
                  </div>
                )}

                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
                  {submitting ? 'Guardando…' : 'Guardar llamada'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
