import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { KpiSummary } from '@/lib/types'
import DashboardNav from '@/components/DashboardNav'

async function getKpis(sede?: string): Promise<KpiSummary> {
  const whereClause = sede ? `WHERE sede = '${sede}'` : ''

  const result = await pool.query(`
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE estado = 'pendiente_llamar')    AS pendiente_llamar,
      COUNT(*) FILTER (WHERE estado = 'no_localizable')      AS no_localizable,
      COUNT(*) FILTER (WHERE estado = 'llamado')             AS llamado,
      COUNT(*) FILTER (WHERE estado = 'interesado')          AS interesado,
      COUNT(*) FILTER (WHERE estado = 'en_proceso_sabadell') AS en_proceso_sabadell,
      COUNT(*) FILTER (WHERE estado = 'convertido')          AS convertidos,
      COUNT(*) FILTER (WHERE estado IN ('rechazado_banco','rechazado_alumno')) AS rechazados
    FROM alumnos
    ${whereClause}
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
  color?: string
}

function KpiCard({ label, value, sub, color = '#005eb8' }: KpiCardProps) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.35rem' }}>
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
  const progreso = kpis.total > 0 ? Math.round((kpis.convertidos / objetivo) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <DashboardNav />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
            Dashboard — Financiaciones Sabadell
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            Conversión de recibo propio a financiación externa. Objetivo: 20% ({objetivo} alumnos)
          </p>
        </div>

        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <KpiCard
            label="Total alumnos"
            value={kpis.total.toLocaleString('es-ES')}
            color="#005eb8"
          />
          <KpiCard
            label="Convertidos"
            value={kpis.convertidos}
            sub={`Objetivo: ${objetivo}`}
            color="#16a34a"
          />
          <KpiCard
            label="Tasa conversión"
            value={`${kpis.tasa_conversion}%`}
            sub="Objetivo: 20%"
            color={kpis.tasa_conversion >= 20 ? '#16a34a' : '#ca8a04'}
          />
          <KpiCard
            label="En proceso Sabadell"
            value={kpis.en_proceso_sabadell}
            color="#7c3aed"
          />
          <KpiCard
            label="Interesados"
            value={kpis.interesado}
            color="#0ea5e9"
          />
          <KpiCard
            label="Pendiente llamar"
            value={kpis.pendiente_llamar}
            color="#f59e0b"
          />
          <KpiCard
            label="No localizable"
            value={kpis.no_localizable}
            color="#6b7280"
          />
          <KpiCard
            label="Rechazados"
            value={kpis.rechazados}
            color="#dc2626"
          />
        </div>

        {/* Barra de progreso hacia objetivo */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600 }}>Progreso hacia objetivo 20%</span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {kpis.convertidos} / {objetivo} alumnos
            </span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(progreso, 100)}%`,
              background: progreso >= 100 ? '#16a34a' : '#005eb8',
              borderRadius: '999px',
              transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
            {progreso}% del objetivo alcanzado
          </div>
        </div>

        {/* Acceso rápido */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="/dashboard/alumnos"
            style={{
              display: 'inline-block',
              background: '#005eb8',
              color: '#fff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
            }}
          >
            Ver todos los alumnos
          </a>
          <a
            href="/dashboard/alumnos?estado=pendiente_llamar"
            style={{
              display: 'inline-block',
              background: '#fff',
              color: '#005eb8',
              border: '1px solid #005eb8',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
            }}
          >
            Pendiente llamar ({kpis.pendiente_llamar})
          </a>
          <a
            href="/dashboard/alumnos?estado=interesado"
            style={{
              display: 'inline-block',
              background: '#fff',
              color: '#0ea5e9',
              border: '1px solid #0ea5e9',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
            }}
          >
            Interesados ({kpis.interesado})
          </a>
        </div>
      </main>
    </div>
  )
}
