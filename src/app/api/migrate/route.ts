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
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acceso_modalidad VARCHAR(30) NOT NULL DEFAULT 'all'`,
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
