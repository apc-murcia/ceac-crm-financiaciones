import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { KpiSummary } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

async function getKpis(): Promise<KpiSummary> {
  const result = await pool.query(`
    SELECT
      COUNT(*)                                                      AS total,
      COUNT(*) FILTER (WHERE estado = 'pendiente_llamar')          AS pendiente_llamar,
      COUNT(*) FILTER (WHERE estado = 'no_localizable')            AS no_localizable,
      COUNT(*) FILTER (WHERE estado = 'llamado')                   AS llamado,
      COUNT(*) FILTER (WHERE estado = 'interesado')                AS interesado,
      COUNT(*) FILTER (WHERE estado = 'en_proceso_sabadell')       AS en_proceso_sabadell,
      COUNT(*) FILTER (WHERE estado = 'convertido')                AS convertidos,
      COUNT(*) FILTER (WHERE estado IN ('rechazado_banco','rechazado_alumno')) AS rechazados,
      COALESCE(SUM(importe_financiado), 0)                         AS volumen_total,
      COALESCE(SUM(importe_financiado) FILTER (WHERE estado = 'convertido'), 0) AS volumen_convertido
    FROM alumnos
  `)

  const row = result.rows[0]
  const total = Number(row.total)
  const convertidos = Number(row.convertidos)

  return {
    total,
    pendiente_llamar: Number(row.pendiente_llamar),
    no_localizable: Number(row.no_localizable),
    llamado: Number(row.llamado),
    interesado: Number(row.interesado),
    en_proceso_sabadell: Number(row.en_proceso_sabadell),
    convertidos,
    rechazados: Number(row.rechazados),
    tasa_conversion: total > 0 ? Math.round((convertidos / total) * 100 * 10) / 10 : 0,
  }
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  highlight?: string
}

function KpiCard({ label, value, sub, accent, highlight }: KpiCardProps) {
  return (
    <div style={{
      background: accent ? '#0017EC' : '#fff',
      border: `1.5px solid ${accent ? '#0017EC' : '#E5E5FA'}`,
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      boxShadow: accent ? '0 4px 16px rgba(0,23,236,0.2)' : '0 1px 4px rgba(0,23,236,0.07)',
      borderTop: highlight ? `4px solid ${highlight}` : undefined,
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: accent ? 'rgba(205,255,79,0.85)' : '#5a5a8a',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: accent ? '#CDFF4F' : '#0017EC',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: '0.75rem',
          color: accent ? 'rgba(255,255,255,0.6)' : '#9ca3af',
          marginTop: '0.4rem',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const kpis = await getKpis()
  const objetivo = Math.round(kpis.total * 0.20)
  const progreso = objetivo > 0 ? Math.min(Math.round((kpis.convertidos / objetivo) * 100), 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0fb' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#0017EC', letterSpacing: '-0.02em' }}>
            Dashboard — Financiaciones Sabadell
          </h1>
          <p style={{ color: '#5a5a8a', marginTop: '0.25rem', fontSize: '0.9375rem' }}>
            Conversión de recibo propio a financiación externa · Objetivo: 20% ({objetivo.toLocaleString('es-ES')} alumnos)
          </p>
        </div>

        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <KpiCard label="Total alumnos" value={kpis.total.toLocaleString('es-ES')} accent />
          <KpiCard label="Convertidos" value={kpis.convertidos} sub={`Objetivo: ${objetivo}`} highlight="#16a34a" />
          <KpiCard
            label="Tasa conversión"
            value={`${kpis.tasa_conversion}%`}
            sub="Objetivo: 20%"
            highlight={kpis.tasa_conversion >= 20 ? '#16a34a' : '#FF9800'}
          />
          <KpiCard label="En proceso Sabadell" value={kpis.en_proceso_sabadell} highlight="#6666F0" />
          <KpiCard label="Interesados" value={kpis.interesado} highlight="#0ea5e9" />
          <KpiCard label="Pendiente de contactar" value={kpis.pendiente_llamar} highlight="#FF9800" />
          <KpiCard label="No localizable" value={kpis.no_localizable} highlight="#9ca3af" />
          <KpiCard label="Rechazados" value={kpis.rechazados} highlight="#F44336" />
        </div>

        {/* Barra de progreso */}
        <div style={{
          background: '#fff',
          border: '1.5px solid #E5E5FA',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,23,236,0.07)',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ fontWeight: 700, color: '#0017EC' }}>Progreso hacia objetivo 20%</span>
            <span style={{ fontSize: '0.875rem', color: '#5a5a8a' }}>
              {kpis.convertidos} / {objetivo} alumnos convertidos
            </span>
          </div>
          <div style={{ background: '#E5E5FA', borderRadius: '999px', height: '14px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progreso}%`,
              background: progreso >= 100 ? '#16a34a' : '#CDFF4F',
              borderRadius: '999px',
              transition: 'width 0.6s ease',
              boxShadow: '0 0 8px rgba(205,255,79,0.5)',
            }} />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#5a5a8a' }}>
            {progreso}% del objetivo alcanzado
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/dashboard/alumnos" className="btn btn-primary">
            Ver todos los alumnos
          </a>
          <a href="/dashboard/alumnos?estado=pendiente_llamar" className="btn btn-outline">
            Pendiente de contactar ({kpis.pendiente_llamar})
          </a>
          <a href="/dashboard/alumnos?estado=interesado" className="btn btn-outline">
            Interesados ({kpis.interesado})
          </a>
          <a href="/dashboard/alumnos?estado=en_proceso_sabadell" className="btn btn-outline">
            En proceso Sabadell ({kpis.en_proceso_sabadell})
          </a>
        </div>

      </main>
    </div>
  )
}
