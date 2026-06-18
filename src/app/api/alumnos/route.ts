import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { AlumnoFilters } from '@/lib/types'

// GET /api/alumnos — Lista con filtros opcionales
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filters: AlumnoFilters = {
    estado: searchParams.get('estado') as any || undefined,
    sede: searchParams.get('sede') as any || undefined,
    asignado_a: searchParams.get('asignado_a') ? Number(searchParams.get('asignado_a')) : undefined,
    search: searchParams.get('search') || undefined,
    page: Number(searchParams.get('page') || 1),
    limit: Math.min(Number(searchParams.get('limit') || 50), 200),
  }

  const conditions: string[] = []
  const params: any[] = []
  let paramIdx = 1

  if (filters.estado) {
    conditions.push(`a.estado = $${paramIdx++}`)
    params.push(filters.estado)
  }
  if (filters.sede) {
    conditions.push(`a.sede = $${paramIdx++}`)
    params.push(filters.sede)
  }
  if (filters.asignado_a) {
    conditions.push(`a.asignado_a = $${paramIdx++}`)
    params.push(filters.asignado_a)
  }
  if (filters.search) {
    conditions.push(
      `(a.nombre ILIKE $${paramIdx} OR a.apellidos ILIKE $${paramIdx} OR a.email ILIKE $${paramIdx} OR a.telefono ILIKE $${paramIdx})`
    )
    params.push(`%${filters.search}%`)
    paramIdx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = ((filters.page || 1) - 1) * (filters.limit || 50)

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumnos a ${where}`,
      params
    )
    const total = Number(countResult.rows[0].count)

    params.push(filters.limit)
    params.push(offset)

    const result = await pool.query(
      `SELECT
         a.*,
         u.nombre AS agente_nombre
       FROM alumnos a
       LEFT JOIN usuarios u ON u.id = a.asignado_a
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    )

    return NextResponse.json({
      data: result.rows,
      total,
      page: filters.page,
      limit: filters.limit,
      pages: Math.ceil(total / (filters.limit || 50)),
    })
  } catch (error) {
    console.error('GET /api/alumnos error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/alumnos — Crear alumno manualmente
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = session.user as any
  if (user.rol !== 'admin' && user.rol !== 'supervisor') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      sf_opportunity_id, nombre, apellidos, email,
      telefono, telefono2, sede, curso, modalidad,
      importe_total_recibos, importe_reserva, importe_financiado,
      doc_mgr_status, asignado_a,
    } = body

    if (!sf_opportunity_id || !nombre) {
      return NextResponse.json(
        { error: 'sf_opportunity_id y nombre son obligatorios' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO alumnos (
         sf_opportunity_id, nombre, apellidos, email,
         telefono, telefono2, sede, curso, modalidad,
         importe_total_recibos, importe_reserva, importe_financiado,
         doc_mgr_status, asignado_a
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        sf_opportunity_id, nombre, apellidos || null, email || null,
        telefono || null, telefono2 || null, sede || null, curso || null, modalidad || null,
        importe_total_recibos || null, importe_reserva || null, importe_financiado || null,
        doc_mgr_status || null, asignado_a || null,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'sf_opportunity_id ya existe' }, { status: 409 })
    }
    console.error('POST /api/alumnos error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
