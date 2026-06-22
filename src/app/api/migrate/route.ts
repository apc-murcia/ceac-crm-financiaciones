import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// Endpoint temporal de migración — eliminar tras ejecutar
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-secret')
  if (secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const migrations = [
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS sf_order_id VARCHAR(255)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_total_recibos NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_reserva NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_financiado NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS doc_mgr_status VARCHAR(100)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS ultimo_comentario TEXT`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_conversion VARCHAR(50)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(50)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS observaciones TEXT`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS forma_pago_original VARCHAR(100)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS plazos_original VARCHAR(50)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS financiera_original VARCHAR(100)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_total_original NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_reserva_original NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_financiado_original NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS forma_pago_actual VARCHAR(100)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS financiera_actual VARCHAR(100)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS plazos_actual VARCHAR(50)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_primer_pago_actual DATE`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_total_actual NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_reserva_actual NUMERIC(10,2)`,
    `ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS importe_financiado_actual NUMERIC(10,2)`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acceso_modalidad VARCHAR(30) NOT NULL DEFAULT 'all'`,
    `CREATE TABLE IF NOT EXISTS llamadas (
      id SERIAL PRIMARY KEY,
      alumno_id INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duracion_segundos INTEGER,
      resultado VARCHAR(50),
      comentario TEXT,
      estado_anterior VARCHAR(50),
      estado_nuevo VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_sf_opportunity_id_key`,
    `DROP INDEX IF EXISTS alumnos_sf_opportunity_id_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS alumnos_sf_opportunity_id_key ON alumnos (sf_opportunity_id) WHERE sf_order_id IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_alumnos_sf_order_id ON alumnos (sf_order_id) WHERE sf_order_id IS NOT NULL`,
  ]

  const { rows: whoami } = await pool.query('SELECT current_user, session_user')
  const dbUser = whoami[0]

  const results: { sql: string; ok: boolean; error?: string }[] = []
  for (const sql of migrations) {
    try {
      await pool.query(sql)
      results.push({ sql: sql.slice(0, 60), ok: true })
    } catch (err: any) {
      results.push({ sql: sql.slice(0, 60), ok: false, error: err.message })
    }
  }

  return NextResponse.json({ dbUser, results })
}
