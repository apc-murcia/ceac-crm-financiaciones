import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { AlumnoUpdatePayload } from '@/lib/types'

type Params = { params: { id: string } }

// GET /api/alumnos/[id] — Detalle completo de un alumno
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const alumnoResult = await pool.query(
      `SELECT a.*, u.nombre AS agente_nombre
       FROM alumnos a
       LEFT JOIN usuarios u ON u.id = a.asignado_a
       WHERE a.id = $1`,
      [id]
    )

    if (alumnoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const docResult = await pool.query(
      `SELECT * FROM documentacion WHERE alumno_id = $1 ORDER BY created_at DESC`,
      [id]
    )

    return NextResponse.json({
      alumno: alumnoResult.rows[0],
      documentacion: docResult.rows,
    })
  } catch (error) {
    console.error(`GET /api/alumnos/${id} error:`, error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT /api/alumnos/[id] — Actualizar estado, comentario, asignación
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const body: AlumnoUpdatePayload = await request.json()

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1

    if (body.estado !== undefined) {
      setClauses.push(`estado = $${idx++}`)
      values.push(body.estado)
    }
    if (body.ultimo_comentario !== undefined) {
      setClauses.push(`ultimo_comentario = $${idx++}`)
      values.push(body.ultimo_comentario)
    }
    if (body.asignado_a !== undefined) {
      setClauses.push(`asignado_a = $${idx++}`)
      values.push(body.asignado_a)
    }
    if (body.fecha_ultimo_contacto !== undefined) {
      setClauses.push(`fecha_ultimo_contacto = $${idx++}`)
      values.push(body.fecha_ultimo_contacto)
    }
    if (body.fecha_conversion !== undefined) {
      setClauses.push(`fecha_conversion = $${idx++}`)
      values.push(body.fecha_conversion)
    }
    // Si el estado nuevo es 'convertido', auto-registrar fecha
    if (body.estado === 'convertido' && body.fecha_conversion === undefined) {
      setClauses.push(`fecha_conversion = NOW()`)
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE alumnos SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error(`PUT /api/alumnos/${id} error:`, error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/alumnos/[id] — Solo admin
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = session.user as any
  if (user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden eliminar alumnos' }, { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'DELETE FROM alumnos WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error(`DELETE /api/alumnos/${id} error:`, error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
