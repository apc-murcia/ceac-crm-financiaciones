import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { LlamadaCreatePayload } from '@/lib/types'

type Params = { params: { id: string } }

// GET /api/alumnos/[id]/llamadas — Historial de llamadas de un alumno
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const alumnoId = Number(params.id)
  if (isNaN(alumnoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      `SELECT l.*, u.nombre AS usuario_nombre
       FROM llamadas l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.alumno_id = $1
       ORDER BY l.fecha DESC`,
      [alumnoId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error(`GET /api/alumnos/${alumnoId}/llamadas error:`, error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/alumnos/[id]/llamadas — Registrar nueva llamada
// También actualiza el estado del alumno si se especifica estado_nuevo
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const alumnoId = Number(params.id)
  if (isNaN(alumnoId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const userId = (session.user as any).id as number

  try {
    const body: LlamadaCreatePayload = await request.json()

    if (!body.resultado) {
      return NextResponse.json({ error: 'El campo resultado es obligatorio' }, { status: 400 })
    }

    // Obtener estado actual del alumno
    const alumnoResult = await pool.query(
      'SELECT estado FROM alumnos WHERE id = $1',
      [alumnoId]
    )

    if (alumnoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    const estadoAnterior = alumnoResult.rows[0].estado
    const estadoNuevo = body.estado_nuevo || estadoAnterior

    // Iniciar transacción
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Insertar llamada
      const llamadaResult = await client.query(
        `INSERT INTO llamadas (alumno_id, usuario_id, resultado, comentario, duracion_segundos, estado_anterior, estado_nuevo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          alumnoId,
          userId,
          body.resultado,
          body.comentario || null,
          body.duracion_segundos || null,
          estadoAnterior,
          estadoNuevo,
        ]
      )

      // Actualizar alumno: estado + ultimo_comentario + fecha_ultimo_contacto
      const updateFields: string[] = [
        'fecha_ultimo_contacto = NOW()',
        `estado = $1`,
      ]
      const updateValues: any[] = [estadoNuevo]
      let paramIdx = 2

      if (body.comentario) {
        updateFields.push(`ultimo_comentario = $${paramIdx++}`)
        updateValues.push(body.comentario)
      }

      // Auto-set fecha_conversion si convertido
      if (estadoNuevo === 'convertido' && estadoAnterior !== 'convertido') {
        updateFields.push('fecha_conversion = NOW()')
      }

      updateValues.push(alumnoId)
      await client.query(
        `UPDATE alumnos SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        updateValues
      )

      await client.query('COMMIT')

      return NextResponse.json(llamadaResult.rows[0], { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(`POST /api/alumnos/${alumnoId}/llamadas error:`, error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
