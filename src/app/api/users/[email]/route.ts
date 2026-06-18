import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

function isAdmin(session: any) {
  return session?.user?.rol === 'admin'
}

export async function PUT(req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Solo admin puede editar usuarios' }, { status: 403 })
  }

  const email = decodeURIComponent(params.email)
  const body = await req.json()
  const { nombre, rol, sede, activo, force_change, password } = body

  const sets: string[] = []
  const values: any[] = []
  let idx = 1

  if (nombre !== undefined)       { sets.push(`nombre = $${idx++}`);       values.push(nombre) }
  if (rol !== undefined)          { sets.push(`rol = $${idx++}`);          values.push(rol) }
  if (sede !== undefined)         { sets.push(`sede = $${idx++}`);         values.push(sede || null) }
  if (activo !== undefined)       { sets.push(`activo = $${idx++}`);       values.push(activo) }
  if (force_change !== undefined) { sets.push(`force_change = $${idx++}`); values.push(force_change) }
  if (password)                   { sets.push(`password_hash = $${idx++}`); values.push(await bcrypt.hash(password, 10)) }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  values.push(email)
  const { rows } = await pool.query(`
    UPDATE usuarios SET ${sets.join(', ')}
    WHERE email = $${idx}
    RETURNING id, nombre, email, rol, sede, activo, force_change
  `, values)

  if (!rows.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest, { params }: { params: { email: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Solo admin puede eliminar usuarios' }, { status: 403 })
  }

  const email = decodeURIComponent(params.email)

  // No permitir que el admin se elimine a sí mismo
  if (email === session.user?.email) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const { rowCount } = await pool.query('DELETE FROM usuarios WHERE email = $1', [email])
  if (!rowCount) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
