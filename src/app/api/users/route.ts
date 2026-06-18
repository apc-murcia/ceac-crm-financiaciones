import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

function isAdmin(session: any) {
  return session?.user?.rol === 'admin'
}

function isAdminOrSupervisor(session: any) {
  return ['admin', 'supervisor'].includes(session?.user?.rol)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminOrSupervisor(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { rows } = await pool.query(`
    SELECT id, nombre, email, rol, sede, activo, force_change, created_at
    FROM usuarios
    ORDER BY nombre ASC
  `)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Solo admin puede crear usuarios' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre, email, password, rol, sede } = body

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)

  try {
    const { rows } = await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, sede, force_change)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, nombre, email, rol, sede, activo, force_change, created_at
    `, [nombre, email.toLowerCase().trim(), hash, rol, sede || null])

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }
    throw err
  }
}
